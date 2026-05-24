import { wsClient, MessageDto, ChatInformationDto, ChatUpdatedTitleDto } from "../core/utils/wsClient";
import { getFullUrl } from "../core/utils/url";
import { chatService } from "./chatService";

interface ShowOptions {
    icon?: string;
    chatId?: string;
}

interface ChatMeta {
    title: string;
    type: 'dialog' | 'group' | 'channel';
}

class NotificationService {
    private permission: NotificationPermission = 'default';
    private supported: boolean = false;
    private activeNotifications = new Set<Notification>();
    private audio: HTMLAudioElement | null = null;
    private currentUserId: number | null = null;
    private attached: boolean = false;
    private chatMeta: Map<string, ChatMeta> = new Map();

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

    private getSenderName(dto: MessageDto): string {
        const full = dto.first_name
            ? `${dto.first_name} ${dto.last_name ?? ''}`.trim()
            : '';
        return full || dto.login || `User #${dto.sender_id}`;
    }

    private handleNewMessage = (dto: MessageDto): void => {
        if (this.currentUserId === null) return;
        if (String(dto.sender_id) === String(this.currentUserId)) return;

        const chatId = String(dto.chat_id);
        const chat = this.chatMeta.get(chatId);
        const senderName = this.getSenderName(dto);
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

        this.show(title, body, {
            chatId,
            icon: dto.avatar ? getFullUrl(dto.avatar) : undefined,
        });
    };
}

export const notificationService = new NotificationService();
