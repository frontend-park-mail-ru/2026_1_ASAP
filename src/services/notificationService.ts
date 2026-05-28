import { wsClient, MessageDto, ChatInformationDto, ChatUpdatedTitleDto } from "../core/utils/wsClient";
import { getFullUrl } from "../core/utils/url";
import { chatService } from "./chatService";
import { contactService } from "./contactService";

interface ShowOptions {
    icon?: string;
    chatId?: string;
}

interface ChatMeta {
    title: string;
    type: 'dialog' | 'group' | 'channel';
}

interface SenderMeta {
    firstName?: string;
    lastName?: string;
    login?: string;
    avatarUrl?: string;
}

class NotificationService {
    private permission: NotificationPermission = 'default';
    private supported: boolean = false;
    private activeNotifications = new Set<Notification>();
    private audio: HTMLAudioElement | null = null;
    private currentUserId: number | null = null;
    private attached: boolean = false;
    private chatMeta: Map<string, ChatMeta> = new Map();
    private senderCache: Map<number, SenderMeta> = new Map();
    private senderInflight: Map<number, Promise<SenderMeta>> = new Map();

    public init(): void {
        this.supported = 'Notification' in window;
        if (!this.supported) return;
        this.permission = Notification.permission;

        this.audio = new Audio('/assets/sounds/notification.mp3');
        this.audio.volume = 0.5;
    }

    private playSound(): void {
        if (!this.audio) return;
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {
        });
    }

    public isGranted(): boolean {
        if (!this.supported) return false;
        this.permission = Notification.permission;
        return this.permission === 'granted';
    }

    public canRequest(): boolean {
        if (!this.supported) return false;
        this.permission = Notification.permission;
        return this.permission === 'default';
    }

    /**
     * Запрашивает разрешение у пользователя. Должно вызываться в ответ
     * на user gesture (клик и т.п.), иначе некоторые браузеры (Chrome)
     * могут блокировать запрос.
     */
    public async requestPermission(): Promise<boolean> {
        if (!this.supported) return false;
        if (this.permission === 'granted') return true;
        if (this.permission === 'denied') return false;

        this.permission = await Notification.requestPermission();


        if (this.permission === 'granted' && this.audio) {
            const oldVolume = this.audio.volume;
            this.audio.volume = 0;
            try {
                await this.audio.play();
                this.audio.pause();
                this.audio.currentTime = 0;
            } catch {}
            this.audio.volume = oldVolume;
        }

        return this.permission === 'granted';
    }

    /**
     * Показывает уведомление если:
     * - есть разрешение;
     * - вкладка НЕ в фокусе (иначе спам уведомлений когда юзер уже видит сообщение).
     *
     * @param title - имя отправителя или заголовок
     * @param body  - превью текста сообщения
     */
    public show(title: string, body: string, options: ShowOptions = {}): Notification | null {
        if (!this.isGranted()) return null;
        if (document.visibilityState === 'visible' && document.hasFocus()) return null;

        this.playSound();

        try {
            const notif = new Notification(title, {
                body,
                icon: options.icon || '/assets/images/icons/Logo.svg',
                tag: options.chatId ? `chat-${options.chatId}` : undefined,
                data: { chatId: options.chatId },
            });

            notif.onclick = (e) => {
                e.preventDefault();
                window.focus();
                if (options.chatId) {
                    window.dispatchEvent(new CustomEvent('notification:click', {
                        detail: { chatId: options.chatId },
                    }));
                }
                notif.close();
                this.activeNotifications.delete(notif);
            };

            notif.onclose = () => {
                this.activeNotifications.delete(notif);
            };

            this.activeNotifications.add(notif);
            return notif;
        } catch (e) {
            console.warn('notificationService.show failed', e);
            return null;
        }
    }

    public closeAll(): void {
        this.activeNotifications.forEach(n => n.close());
        this.activeNotifications.clear();
    }

    /**
     * Подписывает глобальный listener на message.New для уведомлений.
     * Зовётся после успешной авторизации, не зависит от страницы.
     */
    public attach(currentUserId: number): void {
        if (this.attached) return;
        // Защита от испорченных payload'ов: если id не пришёл/не число — не подписываемся,
        // иначе guard «своё/чужое» сорвётся и пользователь получит уведомление на собственное сообщение.
        if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
            console.warn('notificationService.attach: invalid currentUserId, skip', currentUserId);
            return;
        }
        this.currentUserId = currentUserId;
        this.attached = true;
        wsClient.subscribe<MessageDto>('message.New', this.handleNewMessage);
        wsClient.subscribe<ChatInformationDto>('chat.New', this.handleChatNew);
        wsClient.subscribe<ChatUpdatedTitleDto>('chat.Updated.Title', this.handleChatTitleUpdated);

        // Предзагружаем список чатов, чтобы для group/channel сразу знать
        // название чата и тип. handleNewMessage умеет fallback'нуться без них.
        this.preloadChatMeta(currentUserId);
    }

    public detach(): void {
        if (!this.attached) return;
        wsClient.unsubscribe('message.New', this.handleNewMessage);
        wsClient.unsubscribe('chat.New', this.handleChatNew);
        wsClient.unsubscribe('chat.Updated.Title', this.handleChatTitleUpdated);
        this.attached = false;
        this.currentUserId = null;
        this.chatMeta.clear();
        this.senderCache.clear();
        this.senderInflight.clear();
        this.closeAll();
    }

    private async preloadChatMeta(currentUserId: number): Promise<void> {
        try {
            const chats = await chatService.getChats(currentUserId);
            chats.forEach((c) => {
                this.chatMeta.set(String(c.id), { title: c.title, type: c.type });
            });
        } catch (e) {
            console.warn('notificationService: preloadChatMeta failed', e);
        }
    }

    private handleChatNew = (dto: ChatInformationDto): void => {
        this.chatMeta.set(String(dto.id), { title: dto.title, type: dto.chat_type });
    };

    private handleChatTitleUpdated = (dto: ChatUpdatedTitleDto): void => {
        const existing = this.chatMeta.get(String(dto.chat_id));
        if (existing) {
            this.chatMeta.set(String(dto.chat_id), { ...existing, title: dto.title });
        }
    };

    private buildSenderName(meta: SenderMeta, senderId: number): string {
        const full = meta.firstName ? `${meta.firstName} ${meta.lastName ?? ''}`.trim() : '';
        if (full) return full;
        if (meta.login && !meta.login.startsWith('user_')) return meta.login;
        return `User #${senderId}`;
    }

    /**
     * Собирает meta отправителя: из самого DTO (если бэк положил поля),
     * иначе из кеша, иначе — REST-запрос с дедупом.
     */
    private async resolveSenderMeta(dto: MessageDto): Promise<SenderMeta> {
        if (dto.first_name || dto.last_name || (dto.login && !dto.login.startsWith('user_'))) {
            const meta: SenderMeta = {
                firstName: dto.first_name,
                lastName: dto.last_name,
                login: dto.login,
                avatarUrl: dto.avatar ?? undefined,
            };
            this.senderCache.set(dto.sender_id, meta);
            return meta;
        }
        const cached = this.senderCache.get(dto.sender_id);
        if (cached) return cached;

        const inflight = this.senderInflight.get(dto.sender_id);
        if (inflight) return inflight;

        const promise = contactService.getProfileInfo(dto.sender_id)
            .then((profile) => {
                const meta: SenderMeta = {
                    firstName: profile.mainInfo.firstName,
                    lastName: profile.mainInfo.lastName,
                    login: profile.additionalInfo.login,
                    avatarUrl: profile.mainInfo.avatarUrl,
                };
                this.senderCache.set(dto.sender_id, meta);
                return meta;
            })
            .catch(() => ({} as SenderMeta))
            .finally(() => {
                this.senderInflight.delete(dto.sender_id);
            });
        this.senderInflight.set(dto.sender_id, promise);
        return promise;
    }

    private handleNewMessage = async (dto: MessageDto): Promise<void> => {
        const myId = this.currentUserId;
        // Нет валидного currentUserId — не рискуем, выходим (лучше не показать чужое,
        // чем показать своё).
        if (myId == null || !Number.isFinite(myId)) return;

        // Сравниваем как числа — защита от случаев, когда sender_id приходит строкой.
        const senderId = Number(dto.sender_id);
        if (Number.isFinite(senderId) && senderId === myId) return;

        const chatId = String(dto.chat_id);
        const chat = this.chatMeta.get(chatId);
        const senderMeta = await this.resolveSenderMeta(dto);
        const senderName = this.buildSenderName(senderMeta, dto.sender_id);
        const bodyText = dto.text || (dto.sticker ? (dto.sticker.emoji ? `${dto.sticker.emoji} Стикер` : 'Стикер') : '');

        let title: string;
        let body: string;

        if (chat && (chat.type === 'group' || chat.type === 'channel')) {
            title = chat.title || senderName;
            body = chat.type === 'group' ? `${senderName}: ${bodyText}` : bodyText;
        } else {
            // Диалог (или ещё не подгрузился meta) — title = имя отправителя.
            title = senderName;
            body = bodyText;
        }

        const icon = dto.avatar
            ? getFullUrl(dto.avatar)
            : (senderMeta.avatarUrl ? getFullUrl(senderMeta.avatarUrl) : undefined);

        this.show(title, body, { chatId, icon });
    };
}

export const notificationService = new NotificationService();
