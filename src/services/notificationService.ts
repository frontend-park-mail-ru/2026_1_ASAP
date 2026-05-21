import { wsClient, MessageDto } from "../core/utils/wsClient";
import { getFullUrl } from "../core/utils/url";

interface ShowOptions {
    icon?: string;
    chatId?: string;
}

class NotificationService {
    private permission: NotificationPermission = 'default';
    private supported: boolean = false;
    private activeNotifications = new Set<Notification>();
    private audio: HTMLAudioElement | null = null;
    private currentUserId: number | null = null;
    private attached: boolean = false;

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
    }

    public detach(): void {
        if (!this.attached) return;
        wsClient.unsubscribe('message.New', this.handleNewMessage);
        this.attached = false;
        this.currentUserId = null;
        this.closeAll();
    }

    private handleNewMessage = (dto: MessageDto): void => {
        if (this.currentUserId === null) return;
        if (String(dto.sender_id) === String(this.currentUserId)) return;

        const senderName = dto.first_name
            ? `${dto.first_name} ${dto.last_name ?? ''}`.trim()
            : (dto.login || 'Новое сообщение');

        this.show(senderName, dto.text || '', {
            chatId: dto.chat_id.toString(),
            icon: dto.avatar ? getFullUrl(dto.avatar) : undefined,
        });
    };
}

export const notificationService = new NotificationService();
