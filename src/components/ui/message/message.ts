import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage } from '../../../types/chat';
import template from './message.hbs';
import { Avatar } from '../../ui/avatar/avatar';
import { chatService } from "../../../services/chatService";
import { User } from "../../../types/chat";
import { EditMsgOverlay } from '../../composite/editMsgOverlay/editMsgOverlay';
import { ConfirmModal } from "../../composite/confirmModal/confirmModal";

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
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private touchStartX = 0;
    private touchStartY = 0;

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

    private readonly handleTouchStart = (e: TouchEvent): void => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        this.touchStartX = t.clientX;
        this.touchStartY = t.clientY;

        this.longPressTimer = setTimeout(() => {
            if (!/^\d+$/.test(this.getId())) return;
            if (!this.props.isOwn) return;
            this.openEditOverlay();
        }, 500);
    };

    private readonly handleTouchMove = (e: TouchEvent): void => {
        if (!this.longPressTimer || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = Math.abs(t.clientX - this.touchStartX);
        const dy = Math.abs(t.clientY - this.touchStartY);
        if (dx > 8 || dy > 8) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    private readonly handleTouchEnd = (): void => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

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
        if (!/^\d+$/.test(this.getId())) return;
        if (!this.props.isOwn) return;
        this.openEditOverlay();
    };

    public applyHighlight(query: string): void {
        const textEl = this.element?.querySelector('.message__text');
        if (!textEl) return;

        const rawText = this.props.message.text;
        textEl.textContent = '';

        if (!query) {
            textEl.textContent = rawText;
            return;
        }

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const parts = rawText.split(regex);

        parts.forEach(part => {
            if (regex.test(part)) {
                const mark = document.createElement('span');
                mark.className = 'search-highlight';
                mark.textContent = part;
                textEl.appendChild(mark);
            } else {
                textEl.appendChild(document.createTextNode(part));
            }
            regex.lastIndex = 0;
        });
    }

    public updateText(newText: string, edited = true): void {
        this.props.message.text = newText;
        const textEl = this.element?.querySelector('.message__text');
        if (textEl) textEl.textContent = newText;
        const editedEl = this.element?.querySelector<HTMLElement>('.message__edited');
        if (editedEl) {
            editedEl.hidden = !edited;
        }
    }

    private handleDelete = () => {
        const modal = new ConfirmModal({
            text: "Вы уверены, что хотите удалить это сообщение у всех?",
            confirmButtonText: "Удалить",
            cancelButtonText: "Оставить",
            onConfirm: () => {
                this.props.onDelete(this.getId());
                modal.unmount();
            },
            onCancel: () => {
                modal.unmount();
            }
        });
        modal.mount(document.body);
    };

    private openEditOverlay(): void {
        if (!this.element) return;
        this.closeEditOverlay();
        this.editMsgOverlay = new EditMsgOverlay({
            anchorRect: this.element.getBoundingClientRect(),
            onEdit: () => {
                this.props.onEdit?.(this.getId());
                this.closeEditOverlay();
            },
            onDelete: this.handleDelete,
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
        this.element!.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.element!.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        this.element!.addEventListener('touchend', this.handleTouchEnd);
        this.element!.addEventListener('touchcancel', this.handleTouchEnd);

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
        this.element!.removeEventListener('touchstart', this.handleTouchStart);
        this.element!.removeEventListener('touchmove', this.handleTouchMove);
        this.element!.removeEventListener('touchend', this.handleTouchEnd);
        this.element!.removeEventListener('touchcancel', this.handleTouchEnd);
        if (this.longPressTimer) clearTimeout(this.longPressTimer);
        this.closeEditOverlay();
    }
}