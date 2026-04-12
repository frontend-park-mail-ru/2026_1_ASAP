import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage } from '../../../types/chat';
import template from './message.hbs';
import { Avatar } from '../../ui/avatar/avatar';
import { chatService } from "../../../services/chatService";
import { User } from "../../../types/chat";

/**
 * @interface MessageProps - Свойства компонента сообщения.
 * @property {FrontendMessage} message - Объект сообщения.
 * @property {boolean} isOwn - Флаг, является ли сообщение текущего пользователя.
 * @property {boolean} showAuthor - Флаг, нужно ли показывать имя автора.
 */
interface MessageProps extends IBaseComponentProps {
    message: FrontendMessage;
    isOwn: boolean;
    showAuthor: boolean;
    senderName?: string | null;
}

/**
 * Компонент для отображения одного сообщения в диалоге.
 */
export class Message extends BaseComponent<MessageProps> {
    /**
     * @param {MessageProps} props - Свойства компонента.
     */
    constructor(props: MessageProps) {
        super(props);

        this.props.isOwn = props.isOwn;
        this.props.showAuthor = props.showAuthor;
        this.props.formattedTime = props.message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    getTemplate() {
        return template;
    }

    private avatarComponent: Avatar | null = null;

    /**
     * Возвращает отображаемое имя отправителя сообщения.
     * @param {User} user - Объект пользователя.
     * @returns {string | null} Имя для отображения или null, если требуется загрузка.
     * @private
     */
    private getSenderDisplayName(user: User): string | null {
        if (this.props.isOwn) return "Вы";

        const { firstName, lastName, login } = user;
        
        if ((!login || login.startsWith('user_')) && !firstName && !lastName) {
            return null;
        }

        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        return fullName || login;
    }

    /**
     * Асинхронно загружает профиль отправителя и обновляет DOM.
     * @param {number} senderId - ID отправителя.
     * @private
     */
    private async fetchAndSetSenderName(senderId: number) {
        try {
            const profile = await chatService.getUserProfile(senderId);
            
            if (profile) {
                this.props.message.sender = {
                    ...this.props.message.sender,
                    ...profile
                };

                if (this.avatarComponent && profile.avatarUrl) {
                    this.avatarComponent.props.src = profile.avatarUrl;
                    const img = this.avatarComponent.element?.querySelector('img');
                    if (img) {
                        img.src = profile.avatarUrl;
                    }
                }

                this.props.senderName = this.getSenderDisplayName(this.props.message.sender);

                // Точечно обновляем только имя автора в DOM
                const authorEl = this.element?.querySelector('.message__author');
                if (authorEl) {
                    authorEl.textContent = this.props.senderName || '';
                }
            }
        } catch (error) {
        }
    }

    /**
     * @override
     */
    protected afterMount(): void {
        if (!this.element) {
            console.error("message: нет эллемента для монтирования");
            return;
        }
        this.props.senderName = this.getSenderDisplayName(this.props.message.sender);

        if (this.props.isOwn) {
            return;
        }

        if (this.props.showAuthor && !this.props.senderName) {
            const senderId = this.props.message.sender.id;
            if (senderId) {
                this.fetchAndSetSenderName(senderId);
            }
        }

        const avatarSlot = this.element.querySelector('[data-component="message-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.message.sender.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'message__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
    }
}