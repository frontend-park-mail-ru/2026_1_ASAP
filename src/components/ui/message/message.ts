import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage, MessageAttachment, MessageStatus, User } from '../../../types/chat';
import template from './message.hbs';
import { Avatar } from '../../ui/avatar/avatar';
import { EditMsgOverlay } from '../../composite/editMsgOverlay/editMsgOverlay';
import { ConfirmModal } from "../../composite/confirmModal/confirmModal";
import { VoiceMessage } from '../voiceMessage/voiceMessage';

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
    onMediaClick?: (attachments: MessageAttachment[], initialIndex: number, messageId: string) => void;
    onContactClick?: (userId: number) => void;
    onTranscribe?: (messageId: string, attachmentId?: number) => void;
    /** Клик по индикатору «не отправлено» → переотправка. */
    onRetry?: (id: string) => void;
    /** Подписчик ли пользователь — нужно для NSFW-блюра вложений. */
    isPremium?: boolean;
    /** Общий Set разблюренных attachment'ов, ключ `${messageId}:${idx}`. Управляется messageList. */
    revealedAttachments?: Set<string>;
    /** Колбэк при клике по CTA «Доступно с Pulse Premium» (без подписки). */
    onPremiumRequired?: () => void;
}

/**
 * Компонент для отображения одного сообщения в диалоге.
 */
export class Message extends BaseComponent<MessageProps> {
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private touchStartX = 0;
    private touchStartY = 0;
    private childComponents: BaseComponent[] = [];

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
            const hasVoice = this.props.message.attachments?.some(a => a.type === 'voice');
            const isVoiceOnlyText = newText.match(/^\[Голосовое[^\d]*(\d+:\d+)?\]$/i);
            
            if (hasVoice && isVoiceOnlyText) {
                (textEl as HTMLElement).hidden = true;
            } else {
                (textEl as HTMLElement).hidden = newText.length === 0;
            }
        }
        const editedEl = this.element?.querySelector<HTMLElement>('.message__edited');
        if (editedEl) {
            editedEl.hidden = !edited;
        }
    }

    public setStatus(status: MessageStatus): void {
        this.props.message.status = status;
        if (!this.element) return;
        const el = this.element.querySelector<HTMLElement>('.message__status');
        if (!el) return;

        el.classList.remove(
            'message__status--sending',
            'message__status--sent',
            'message__status--read',
            'message__status--failed',
        );
        el.classList.add(`message__status--${status}`);

        el.textContent = status === 'sending' ? '⏱'
                       : status === 'sent'    ? '✓'
                       : status === 'failed'  ? '⚠'
                       : '✓✓';

        // В состоянии «не отправлено» индикатор кликабельный — повторяет отправку.
        const isFailed = status === 'failed';
        el.classList.toggle('message__status--clickable', isFailed);
        el.title = isFailed ? 'Не отправлено. Нажмите, чтобы повторить' : '';
        el.onclick = isFailed ? () => this.props.onRetry?.(this.props.message.id) : null;
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
            // У стикеров текст пустой — редактировать нечего.
            hideEdit: Boolean(this.props.message.sticker),
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

        const mediaAttachments = attachments.filter(a => a.type === 'photo' || a.type === 'video');
        let currentMediaIndex = 0;

        // Clear previous child components unmounting them properly
        this.childComponents.forEach(c => c.unmount());
        this.childComponents = [];

        attachments.forEach((attachment) => {
            switch (attachment.type) {
                case 'photo':
                    container.appendChild(this.createPhotoAttachment(attachment, currentMediaIndex++, mediaAttachments));
                    break;
                case 'video':
                    container.appendChild(this.createVideoAttachment(attachment, currentMediaIndex++, mediaAttachments));
                    break;
                case 'file':
                    container.appendChild(this.createFileAttachment(attachment.url, attachment.fileName));
                    break;
                case 'contact':
                    container.appendChild(this.createContactAttachment(attachment));
                    break;
                case 'voice': {
                    const voiceWrapper = document.createElement('div');
                    container.appendChild(voiceWrapper);
                    
                    let durationText = undefined;
                    const match = this.props.message.text?.match(/\[Голосовое[^\d]*(\d+:\d+)\]/i);
                    if (match) {
                        durationText = match[1];
                    }

                    const voiceMsg = new VoiceMessage({ 
                        url: attachment.url,
                        durationStr: durationText,
                        messageId: this.props.message.id,
                        attachmentId: attachment.id,
                        canTranscribe: attachment.canTranscribe,
                        transcript: attachment.transcript,
                        onTranscribe: this.props.onTranscribe
                    });
                    voiceMsg.mount(voiceWrapper);
                    this.childComponents.push(voiceMsg);
                    break;
                }
                default:
                    break;
            }
        });

        const textEl = this.element?.querySelector<HTMLElement>('.message__text');
        let textIsVisible = false;
        if (textEl) {
            const hasVoice = attachments.some(a => a.type === 'voice');
            const isVoiceOnlyText = this.props.message.text?.match(/^\[Голосовое[^\d]*(\d+:\d+)?\]$/i);

            if (hasVoice && isVoiceOnlyText) {
                textEl.hidden = true;
            } else {
                textEl.hidden = !this.props.message.text;
            }
            textIsVisible = !textEl.hidden;
        }

        // Если в сообщении только вложения (без текста) — снимаем общий «бабл»-фон,
        // чтобы каждое вложение читалось как самостоятельная карточка/пилюля.
        this.element?.classList.toggle(
            'message--attachments-only',
            attachments.length > 0 && !textIsVisible,
        );
    }

    private createFileAttachment(url?: string, fileName?: string): HTMLElement {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'message__attachment message__attachment--file';

        const icon = document.createElement('img');
        icon.className = 'message__attachment-icon';
        icon.src = '/assets/images/icons/file.svg';
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

    private createPhotoAttachment(attachment: MessageAttachment, mediaIndex: number, allMedia: MessageAttachment[]): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'message__attachment-media-link';
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');
        wrapper.setAttribute('aria-label', attachment.fileName || 'Фото');

        wrapper.classList.add('message__attachment-media-link--loading');
        
        const image = document.createElement('img');
        image.className = 'message__attachment-media message__attachment-media--photo';
        image.src = attachment.url || '';
        image.alt = attachment.fileName || 'Фото';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.crossOrigin = 'use-credentials';
        image.style.opacity = '0';
        image.style.transition = 'opacity 0.3s ease';

        image.addEventListener('load', () => {
            wrapper.classList.remove('message__attachment-media-link--loading');
            image.style.opacity = '1';
        }, { once: true });

        // Фоллбэк при ошибке загрузки (403, 404, сеть): показываем подсказку, не broken-иконку браузера
        image.addEventListener('error', () => {
            wrapper.classList.remove('message__attachment-media-link--loading');
            image.style.opacity = '1';
            image.alt = 'Не удалось загрузить фото';
            image.classList.add('message__attachment-media--broken');
        }, { once: true });

        wrapper.addEventListener('click', () => {
            this.props.onMediaClick?.(allMedia, mediaIndex, this.props.message.id);
        });

        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.props.onMediaClick?.(allMedia, mediaIndex, this.props.message.id);
            }
        });

        wrapper.appendChild(image);
        this.applyBlurGate(wrapper, image, attachment, mediaIndex);
        return wrapper;
    }

    /** Ключ разблюренного вложения в общем Set'е messageList. */
    private blurKey(mediaIndex: number): string {
        return `${this.props.message.id}:${mediaIndex}`;
    }

    /**
     * Навешивает NSFW-блюр на медиа-вложение, помеченное бэком `isBlur`.
     * Снимает блюр только подписчик — после подтверждения в ConfirmModal.
     * Не-подписчику клик по оверлею открывает CTA подписки.
     */
    private applyBlurGate(
        wrapper: HTMLElement,
        media: HTMLElement,
        attachment: MessageAttachment,
        mediaIndex: number,
    ): void {
        if (!attachment.isBlur) return;
        if (this.props.revealedAttachments?.has(this.blurKey(mediaIndex))) return;

        const isPremium = this.props.isPremium ?? false;
        media.classList.add('message__attachment-media--blurred');

        const overlay = document.createElement('div');
        overlay.className = 'message__attachment-blur';
        overlay.setAttribute('role', 'button');
        overlay.setAttribute('tabindex', '0');

        const icon = document.createElement('img');
        icon.className = 'message__attachment-blur-icon';
        icon.src = '/assets/images/icons/closeEye.svg';
        icon.alt = '';
        icon.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'message__attachment-blur-label';
        label.textContent = isPremium
            ? 'Слишком милый контент. Нажмите, чтобы показать'
            : 'Доступно с подпиской ImPulse';

        overlay.append(icon, label);
        overlay.setAttribute('aria-label', label.textContent);

        const activate = (e: Event): void => {
            // Перехватываем клик до wrapper'а, чтобы не открыть медиа-вьюер.
            e.stopPropagation();
            e.preventDefault();
            if (isPremium) {
                this.confirmRevealAttachment(wrapper, media, overlay, mediaIndex);
            } else {
                this.props.onPremiumRequired?.();
            }
        };

        overlay.addEventListener('click', activate);
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') activate(e);
        });

        wrapper.appendChild(overlay);
    }

    /** Подтверждение показа NSFW-вложения подписчику. */
    private confirmRevealAttachment(
        wrapper: HTMLElement,
        media: HTMLElement,
        overlay: HTMLElement,
        mediaIndex: number,
    ): void {
        const modal = new ConfirmModal({
            text: 'Изображение может содержать слишком милый контент. Показать его?',
            confirmButtonText: 'Показать',
            cancelButtonText: 'Отмена',
            onConfirm: () => {
                modal.unmount();
                this.props.revealedAttachments?.add(this.blurKey(mediaIndex));
                media.classList.remove('message__attachment-media--blurred');
                if (wrapper.contains(overlay)) overlay.remove();
            },
            onCancel: () => modal.unmount(),
        });
        modal.mount(document.body);
        this.childComponents.push(modal);
    }

    private createVideoAttachment(attachment: MessageAttachment, mediaIndex: number, allMedia: MessageAttachment[]): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'message__attachment-video';
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('tabindex', '0');

        wrapper.classList.add('message__attachment-video--loading');

        const video = document.createElement('video');
        video.className = 'message__attachment-media message__attachment-media--video';
        video.src = attachment.url || '';
        video.preload = 'metadata';
        video.crossOrigin = 'use-credentials';
        video.style.opacity = '0';
        video.style.transition = 'opacity 0.3s ease';
        if (attachment.fileName) video.setAttribute('aria-label', attachment.fileName);

        video.addEventListener('loadeddata', () => {
            wrapper.classList.remove('message__attachment-video--loading');
            video.style.opacity = '1';
        }, { once: true });

        const playOverlay = document.createElement('div');
        playOverlay.className = 'message__attachment-video-play';
        const playTriangle = document.createElement('div');
        playTriangle.className = 'message__attachment-video-play-icon';
        playOverlay.appendChild(playTriangle);

        wrapper.addEventListener('click', () => {
            this.props.onMediaClick?.(allMedia, mediaIndex, this.props.message.id);
        });

        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.props.onMediaClick?.(allMedia, mediaIndex, this.props.message.id);
            }
        });

        // Фоллбэк при ошибке загрузки: заменяем плеер div-заглушкой, чтобы не торчал пустой controls-бар
        video.addEventListener('error', () => {
            wrapper.classList.remove('message__attachment-video--loading');
            video.style.opacity = '1';
            const errEl = document.createElement('div');
            errEl.className = 'message__attachment-video-error';
            errEl.textContent = 'Не удалось загрузить видео';
            if (wrapper.contains(video)) wrapper.replaceChild(errEl, video);
            if (wrapper.contains(playOverlay)) playOverlay.remove();
        }, { once: true });

        wrapper.appendChild(video);
        wrapper.appendChild(playOverlay);
        this.applyBlurGate(wrapper, video, attachment, mediaIndex);
        return wrapper;
    }

    private createContactAttachment(attachment: MessageAttachment): HTMLElement {
        const card = document.createElement('div');
        card.className = 'message__attachment message__attachment--contact';

        const icon = document.createElement('img');
        if (attachment.contactAvatarUrl) {
            icon.className = 'message__attachment-icon message__attachment-avatar';
            icon.src = attachment.contactAvatarUrl;
        } else {
            icon.className = 'message__attachment-icon';
            icon.src = '/assets/images/icons/contactAttachment.svg';
        }
        icon.alt = '';

        const name = document.createElement('span');
        name.className = 'message__attachment-name';
        name.textContent = [attachment.contactFirstName, attachment.contactLastName].filter(Boolean).join(' ')
            || (attachment.contactUserId ? `User #${attachment.contactUserId}` : 'Контакт');

        card.append(icon, name);
        
        if (attachment.contactUserId && this.props.onContactClick) {
            card.addEventListener('click', () => {
                this.props.onContactClick!(attachment.contactUserId!);
            });
            card.style.cursor = 'pointer';
        }
        
        return card;
    }

    /**
     * Если сообщение — стикер, подменяет блок .message__text на <img> со стикером.
     * Текст для стикеровых сообщений с бэка приходит пустым.
     */
    private renderStickerIfPresent(): void {
        const sticker = this.props.message.sticker;
        if (!sticker || !this.element) return;

        const wrapper = this.element.querySelector('.message__content-wrapper');
        const textEl = this.element.querySelector('.message__text');
        if (!wrapper || !textEl) return;

        const stickerEl = document.createElement('img');
        stickerEl.className = 'message__sticker';
        stickerEl.src = sticker.fileUrl;
        stickerEl.alt = sticker.emoji || sticker.slug || 'стикер';
        stickerEl.loading = 'lazy';

        textEl.replaceWith(stickerEl);
        this.element.classList.add('message--sticker');
    }

    /**
     * Обновляет текст расшифровки для голосового сообщения с указанным attachmentId.
     * Также сохраняет результат в локальных props сообщения.
     *
     * @param {number} attachmentId - Идентификатор вложения.
     * @param {string} transcript - Текст расшифровки.
     * @public
     */
    public updateVoiceTranscript(attachmentId: number, transcript: string): void {
        let attachment = this.props.message.attachments?.find(a => a.type === 'voice' && a.id === attachmentId);
        
        // Фолбек: если по ID не нашли, но голосовое вложение ровно одно, используем его
        if (!attachment) {
            const voiceAttachments = this.props.message.attachments?.filter(a => a.type === 'voice') || [];
            if (voiceAttachments.length === 1) {
                attachment = voiceAttachments[0];
            }
        }

        if (attachment) {
            attachment.transcript = transcript;
        }

        const voiceComponents = this.childComponents.filter(comp => comp instanceof VoiceMessage) as VoiceMessage[];
        
        // Ищем компонент с точным совпадением по ID
        let targetComp = voiceComponents.find(comp => comp.getAttachmentId() === attachmentId);
        
        // Фолбек: если точного совпадения нет, но компонент голосового сообщения ровно один, обновляем его
        if (!targetComp && voiceComponents.length === 1) {
            targetComp = voiceComponents[0];
        }

        if (targetComp) {
            targetComp.setTranscript(transcript);
        }
    }

    /**
     * Устанавливает текст ошибки для голосового сообщения с указанным attachmentId.
     *
     * @param {number} attachmentId - Идентификатор вложения.
     * @param {string} error - Текст ошибки.
     * @public
     */
    public setVoiceTranscriptError(attachmentId: number, error: string): void {
        const voiceComponents = this.childComponents.filter(comp => comp instanceof VoiceMessage) as VoiceMessage[];
        
        let targetComp = voiceComponents.find(comp => comp.getAttachmentId() === attachmentId);
        
        if (!targetComp && voiceComponents.length === 1) {
            targetComp = voiceComponents[0];
        }

        if (targetComp) {
            targetComp.setTranscriptError(error);
        }
    }

    /**
     * Скрывает кнопку транскрипции для голосового сообщения с указанным attachmentId.
     *
     * @param {number} attachmentId - Идентификатор вложения.
     * @public
     */
    public hideVoiceTranscriptButton(attachmentId: number): void {
        this.childComponents.forEach(comp => {
            if (comp instanceof VoiceMessage && comp.getAttachmentId() === attachmentId) {
                comp.hideTranscribeButton();
            }
        });
    }

    /**
     * Обновляет список вложений сообщения новыми данными и перерисовывает их.
     * Используется для синхронизации оптимистичного сообщения с реальными данными с сервера.
     *
     * @param {MessageAttachment[]} attachments - Список новых вложений.
     * @public
     */
    public updateAttachments(attachments: MessageAttachment[]): void {
        this.props.message.attachments = attachments;
        this.renderAttachments();
    }

    /**
     * Передает ошибку в голосовое вложение, которое в данный момент находится в процессе расшифровки.
     *
     * @param {string} errorText - Текст ошибки.
     * @param {boolean} hideButton - Флаг, нужно ли скрыть кнопку транскрипции.
     * @public
     */
    public setVoiceTranscriptErrorForActiveLoading(errorText: string, hideButton: boolean): void {
        this.childComponents.forEach(comp => {
            if (comp instanceof VoiceMessage && comp.isCurrentlyTranscribing()) {
                if (hideButton) {
                    comp.hideTranscribeButton();
                }
                comp.setTranscriptError(errorText);
            }
        });
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

        this.renderStickerIfPresent();

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
        
        this.childComponents.forEach(c => c.unmount());
        this.childComponents = [];
    }
}
