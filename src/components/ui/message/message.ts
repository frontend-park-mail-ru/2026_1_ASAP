import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage, MessageAttachment, MessageStatus, User } from '../../../types/chat';
import template from './message.hbs';
import { Avatar } from '../../ui/avatar/avatar';
import { EditMsgOverlay } from '../../composite/editMsgOverlay/editMsgOverlay';
import { ConfirmModal } from "../../composite/confirmModal/confirmModal";

/**
 * @interface MessageProps - Свойства компонента сообщения.
 * @property {FrontendMessage} message - Объект сообщения.
 * @property {boolean} isOwn - Флаг, является ли сообщение текущего пользователя.
 * @property {boolean} showAuthor - Флаг, нужно ли показывать имя автора.
 * @property {Function} [onDownloadAttachment] - Колбэк для скачивания вложения; реализация на уровне controller.
 */
interface MessageProps extends IBaseComponentProps {
    message: FrontendMessage;
    isOwn: boolean;
    showAuthor: boolean;
    senderName?: string | null;
    chatAvatarUrl?: string;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onDownloadAttachment?: (url: string, fileName: string) => void | Promise<void>;
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
        this.props.senderName = props.senderName ?? this.getSenderDisplayName(props.message.sender);
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
            return user.id ? `User #${user.id}` : null;
        }

        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        return fullName || login;
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
            (textEl as HTMLElement).hidden = rawText.length === 0;
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
        if (textEl) {
            textEl.textContent = newText;
            (textEl as HTMLElement).hidden = newText.length === 0;
        }
        const editedEl = this.element?.querySelector<HTMLElement>('.message__edited');
        if (editedEl) {
            editedEl.hidden = !edited;
        }
    }

    public setStatus(status: MessageStatus): void {
        this.props.message.status = status;
        if (!this.element) return;
        const el = this.element.querySelector('.message__status');
        if (!el) return;

        el.classList.remove(
            'message__status--sending',
            'message__status--sent',
            'message__status--read',
        );
        el.classList.add(`message__status--${status}`);

        el.textContent = status === 'sending' ? '⏱'
                       : status === 'sent'    ? '✓'
                       : '✓✓';
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

    private renderAttachments(): void {
        const container = this.element?.querySelector<HTMLElement>('[data-component="message-attachments"]');
        if (!container) return;

        const attachments = this.props.message.attachments || [];
        container.textContent = '';
        container.hidden = attachments.length === 0;

        attachments.forEach((attachment) => {
            switch (attachment.type) {
                case 'photo':
                    container.appendChild(this.createPhotoAttachment(attachment));
                    break;
                case 'video':
                    container.appendChild(this.createVideoAttachment(attachment));
                    break;
                case 'file':
                    container.appendChild(this.createFileAttachment(attachment.url, attachment.fileName));
                    break;
                default:
                    break;
            }
        });

        const textEl = this.element?.querySelector<HTMLElement>('.message__text');
        if (textEl) textEl.hidden = !this.props.message.text;
    }

    private createFileAttachment(url?: string, fileName?: string): HTMLElement {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'message__attachment message__attachment--file';

        const icon = document.createElement('img');
        icon.className = 'message__attachment-icon';
        icon.src = '/assets/images/icons/upload.svg';
        icon.alt = '';

        const name = document.createElement('span');
        name.className = 'message__attachment-name';
        name.textContent = fileName || 'Файл';

        card.append(icon, name);
        card.addEventListener('click', () => {
            if (!url) return;
            // Скачивание делегируется контроллеру через callback — компонент остаётся пассивным
            void this.props.onDownloadAttachment?.(url, fileName || 'file');
        });

        return card;
    }

    private createPhotoAttachment(attachment: MessageAttachment): HTMLElement {
        const wrapper = document.createElement('a');
        wrapper.className = 'message__attachment-media-link';
        wrapper.href = attachment.url || '#';
        wrapper.target = '_blank';
        wrapper.rel = 'noopener';
        wrapper.setAttribute('aria-label', attachment.fileName || 'Фото');

        const image = document.createElement('img');
        image.className = 'message__attachment-media message__attachment-media--photo';
        image.src = attachment.url || '';
        image.alt = attachment.fileName || 'Фото';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.crossOrigin = 'use-credentials';

        // Фоллбэк при ошибке загрузки (403, 404, сеть): показываем подсказку, не broken-иконку браузера
        image.addEventListener('error', () => {
            image.alt = 'Не удалось загрузить фото';
            image.classList.add('message__attachment-media--broken');
        }, { once: true });

        wrapper.appendChild(image);
        return wrapper;
    }

    private createVideoAttachment(attachment: MessageAttachment): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'message__attachment-video';

        const video = document.createElement('video');
        video.className = 'message__attachment-media message__attachment-media--video';
        video.src = attachment.url || '';
        video.controls = true;
        video.preload = 'metadata';
        video.crossOrigin = 'use-credentials';
        if (attachment.fileName) video.setAttribute('aria-label', attachment.fileName);

        // Фоллбэк при ошибке загрузки: заменяем плеер div-заглушкой, чтобы не торчал пустой controls-бар
        video.addEventListener('error', () => {
            const errEl = document.createElement('div');
            errEl.className = 'message__attachment-video-error';
            errEl.textContent = 'Не удалось загрузить видео';
            if (wrapper.contains(video)) wrapper.replaceChild(errEl, video);
        }, { once: true });

        wrapper.appendChild(video);
        return wrapper;
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
        this.renderAttachments();

        if (this.props.isOwn) {
            // первичный рендер статуса для своих сообщений
            this.setStatus(this.props.message.status ?? 'sent');
            return;
        }

        const avatarSlot = this.element.querySelector('[data-component="message-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.chatAvatarUrl || this.props.message.sender.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'message__avatar',
                userId: this.props.message.sender.id,
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        // Для постов канала аватар зафиксирован — профиль отправителя не грузим
        if (this.props.chatAvatarUrl) {
            return;
        }

        this.props.senderName = this.getSenderDisplayName(this.props.message.sender);
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
