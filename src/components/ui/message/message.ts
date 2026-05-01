import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage } from '../../../types/chat';
import template from './message.hbs';
import { Avatar } from '../../ui/avatar/avatar';
import { chatService } from "../../../services/chatService";
import { User } from "../../../types/chat";
import { EditMsgOverlay } from '../../composite/editMsgOverlay/editMsgOverlay';

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
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
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
    private editMsgOverlay: EditMsgOverlay | null = null;

    public getId(): string {
        return this.props.message.id;
    }

    public setId(newId: string): void {
        this.props.message.id = newId;
    }

    public updateTimestamp(ts: Date): void {
        this.props.message.timestamp = ts;
        this.props.formattedTime = ts.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
        const el = this.element?.querySelector('.message__time');
        if (el) el.textContent = this.props.formattedTime as string;
    }

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
                    const el = this.avatarComponent.element;
                    const img = el?.tagName === 'IMG' ? (el as HTMLImageElement) : el?.querySelector('img');
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

    handleRightClick = (e: { preventDefault: () => void; }) => {
        e.preventDefault();
        if (!this.props.isOwn) return;
        this.openEditOverlay();
    };

    public updateText(newText: string, edited = true): void {
        this.props.message.text = newText;
        const textEl = this.element?.querySelector('.message__text');
        if (textEl) textEl.textContent = newText;
        const editedEl = this.element?.querySelector<HTMLElement>('.message__edited');
        if (editedEl) {
            editedEl.hidden = !edited;
        }
    }

    private openEditOverlay(): void {
        if (!this.element) return;
        this.closeEditOverlay();
        this.editMsgOverlay = new EditMsgOverlay({
            anchorRect: this.element.getBoundingClientRect(),
            onEdit: () => {
                this.props.onEdit?.(this.getId());
                this.closeEditOverlay();
            },
            onDelete: () => {
                this.props.onDelete?.(this.getId());
                this.closeEditOverlay();
            },
            onClose: () => this.closeEditOverlay(),
        });
        this.editMsgOverlay.mount(document.body);
    }

    private closeEditOverlay(): void {
        this.editMsgOverlay?.unmount();
        this.editMsgOverlay = null;
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
        this.element!.addEventListener('contextmenu', this.handleRightClick);

        if (this.props.isOwn) {
            return;
        }

        const avatarSlot = this.element.querySelector('[data-component="message-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.message.sender.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'message__avatar',
                userId: this.props.message.sender.id,
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        const sender = this.props.message.sender;
        const isDefaultAvatar = !sender.avatarUrl || 
                                sender.avatarUrl.includes('defaultAvatar.svg');
        
        if (!this.props.senderName || isDefaultAvatar) {
            const senderId = sender.id;
            if (senderId) {
                this.fetchAndSetSenderName(senderId);
            }
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
        this.element!.removeEventListener('contextmenu', this.handleRightClick);
        this.closeEditOverlay();
    }
}