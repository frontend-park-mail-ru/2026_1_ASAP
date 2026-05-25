import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm';
import { Button } from '../button/button';
import { ConfirmModal } from '../../composite/confirmModal/confirmModal';
import type { MessageAttachment, MessageAttachmentType, OutgoingMessageAttachment } from '../../../types/chat';
import type { FrontendContact } from '../../../types/contact';
import { StickerEmojiOverlay } from '../../composite/stickerEmojiOverlay/stickerEmojiOverlay';
import { Sticker } from '../../../types/chat';
import { VoiceRecorder } from '../voiceRecorder/voiceRecorder';
import template from './messageInput.hbs';

type UploadableAttachmentType = Extract<MessageAttachmentType, 'photo' | 'video' | 'file' | 'voice'>;

type DraftAttachment = {
    id: string;
    attachment: MessageAttachment;
    outgoing: OutgoingMessageAttachment;
};

/**
 * @interface MessageInputProps - Свойства компонента формы ввода сообщения.
 */
interface MessageInputProps extends IBaseFormProps { 
    onSubmit: (text: string, attachments: OutgoingMessageAttachment[], draftAttachments: MessageAttachment[]) => void | Promise<void>;
    onUploadFile?: (file: File, type: UploadableAttachmentType) => Promise<
        | { success: true; attachment: MessageAttachment; outgoing: OutgoingMessageAttachment }
        | { success: false; errorMessage: string; status?: number }
    >;
    onLoadContacts?: () => Promise<FrontendContact[]>;
    onSubmitEdit?: (messageId: string, text: string) => void;
    onSendSticker?: (sticker: Sticker) => void;
    onTyping?: () => void;
    onStopTyping?: () => void;
    chatId: string;
}

/**
 * Компонент формы для ввода и отправки текстовых сообщений.
 */
export class MessageInput extends BaseForm<MessageInputProps> {
    private editingMessageId: string | null = null;
    private editIndicator: HTMLElement | null = null;
    private cancelEditButton: HTMLButtonElement | null = null;
    private textarea: HTMLTextAreaElement | null = null;
    private uplodadButton: Button | null = null;
    private stikerButton: Button | null = null;
    private sendButton: Button | null = null;
    private recordButton: Button | null = null;
    private voiceRecorder: VoiceRecorder | null = null;
    private inputContainer: HTMLElement | null = null;
    private recorderSlot: HTMLElement | null = null;
    private fileInput: HTMLInputElement | null = null;
    private mediaInput: HTMLInputElement | null = null;
    private attachmentMenu: HTMLElement | null = null;
    private draftAttachmentsContainer: HTMLElement | null = null;
    private errorElement: HTMLElement | null = null;
    private modalComponent: ConfirmModal | null = null;
    private contactPickerOverlay: HTMLElement | null = null;
    private contactPickerContacts: FrontendContact[] = [];
    private contactPickerRequestId = 0;
    private draftAttachments: DraftAttachment[] = [];
    private isUploading = false;
    private stickerOverlay: StickerEmojiOverlay | null = null;
    private readonly mobileQuery = '(max-width: 767px)';
    private readonly maxAttachments = 10;

    constructor(props: MessageInputProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();

        if (!this.element) {
            console.error("MessageInput: елемент не найден при монтировании.");
            return;
        }

        const stickerButtonContainer = this.element.querySelector('[data-component="message-input__sticker-button-container"]');
        this.stikerButton = new Button({
            label: '',
            icon: '/assets/images/icons/sticker.svg',
            class: 'message-input__sticker-button',
            type: 'button',
            title: 'Стикеры и эмодзи',
            onClick: this.handleStickerButtonClick,
        });
        this.stikerButton.mount(stickerButtonContainer as HTMLElement);

        this.textarea = this.element.querySelector('.message-input__textarea') as HTMLTextAreaElement;
        if (this.textarea) {
            this.textarea.addEventListener('keydown', this.handleKeyDown);
            this.textarea.addEventListener('input', this.handleInput);
        }

        this.inputContainer = this.element.querySelector('[data-component="input-container"]');
        this.recorderSlot = this.element.querySelector('[data-component="recorder-slot"]');

        const uploadButtonContainer = this.element.querySelector('[data-component="upload-button-container"]');
        this.uplodadButton = new Button({
            label: '',
            icon: '/assets/images/icons/upload.svg',
            class: 'message-input__upload-button-container',
            type: 'button',
            title: 'Вложения',
            onClick: this.handleUploadButtonClick,
        });
        this.uplodadButton.mount(uploadButtonContainer as HTMLElement);

        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = [
            'application/pdf',
            'application/zip',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            '.pdf',
            '.zip',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.txt',
        ].join(',');
        this.fileInput.hidden = true;
        this.fileInput.addEventListener('change', this.handleFileInputChange);
        this.element.appendChild(this.fileInput);

        this.mediaInput = document.createElement('input');
        this.mediaInput.type = 'file';
        this.mediaInput.accept = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/webm',
            'video/quicktime',
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
            '.gif',
            '.mp4',
            '.webm',
            '.mov',
            '.qt',
        ].join(',');
        this.mediaInput.hidden = true;
        this.mediaInput.addEventListener('change', this.handleMediaInputChange);
        this.element.appendChild(this.mediaInput);

        this.draftAttachmentsContainer = this.element.querySelector('[data-component="draft-attachments"]');
        this.errorElement = this.element.querySelector('[data-component="message-input-error"]');

        const sendButtonContainer = this.element.querySelector('[data-component="send-button-container"]');
        this.sendButton = new Button({
            label: '',
            icon: '/assets/images/icons/sendIcon.svg',
            class: 'message-input__send-button',
            type: 'submit',
        });
        this.sendButton.mount(sendButtonContainer as HTMLElement);

        const recordButtonContainer = this.element.querySelector('[data-component="record-button-container"]');
        if (recordButtonContainer) {
            this.recordButton = new Button({
                label: '',
                icon: '/assets/images/icons/micIcon.svg',
                class: 'message-input__record-button',
                type: 'button',
                onClick: this.startVoiceRecording,
            });
            this.recordButton.mount(recordButtonContainer as HTMLElement);
        }

        this.updateButtonsVisibility();

        // Не даём кнопке забирать фокус с textarea — иначе на мобилках
        // клавиатура схлопывается при каждом тапе по «отправить».
        this.sendButton.element?.addEventListener('pointerdown', this.handleSendPointerDown);
        this.sendButton.element?.addEventListener('mousedown', this.handleSendPointerDown);

        document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
        document.addEventListener('keydown', this.handleDocumentKeyDown);

        if (!this.isMobileViewport()) {
            this.textarea?.focus({ preventScroll: true });
        }
    }

    private updateButtonsVisibility(): void {
        const text = this.textarea?.value.trim() || '';
        const hasText = text.length > 0;
        const hasAttachments = this.draftAttachments.length > 0;
        const canSend = hasText || hasAttachments;

        if (this.voiceRecorder) {
            this.recordButton?.element?.parentElement?.setAttribute('hidden', '');
            this.sendButton?.element?.parentElement?.removeAttribute('hidden');
            this.inputContainer?.setAttribute('hidden', '');
            this.recorderSlot?.removeAttribute('hidden');
        } else {
            this.inputContainer?.removeAttribute('hidden');
            this.recorderSlot?.setAttribute('hidden', '');
            
            if (canSend || this.editingMessageId) {
                this.recordButton?.element?.parentElement?.setAttribute('hidden', '');
                this.sendButton?.element?.parentElement?.removeAttribute('hidden');
            } else {
                this.sendButton?.element?.parentElement?.setAttribute('hidden', '');
                this.recordButton?.element?.parentElement?.removeAttribute('hidden');
            }
        }
    }

    private startVoiceRecording = (event?: Event): void => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (this.voiceRecorder) return;

        this.voiceRecorder = new VoiceRecorder({
            onRecorded: async (file: File) => {
                this.voiceRecorder?.unmount();
                this.voiceRecorder = null;
                this.updateButtonsVisibility();
                await this.attachUpload(file, 'voice');
                this.form?.requestSubmit();
            },
            onCancel: () => {
                this.voiceRecorder?.unmount();
                this.voiceRecorder = null;
                this.updateButtonsVisibility();
            },
            onError: (msg: string) => {
                this.showInlineError(msg);
            }
        });

        if (this.recorderSlot) {
            this.voiceRecorder.mount(this.recorderSlot);
        }
        this.updateButtonsVisibility();
    };

    private handleCancelEdit = (): void => {
        this.exitEditMode();
    };

    private handleUploadButtonClick = (event: MouseEvent): void => {
        event.preventDefault();
        if (this.editingMessageId) {
            this.showInlineError('Завершите редактирование сообщения перед добавлением вложений');
            return;
        }
        this.toggleAttachmentMenu();
    };

    private toggleAttachmentMenu(): void {
        if (this.attachmentMenu) {
            this.closeAttachmentMenu();
            return;
        }
        this.openAttachmentMenu();
    }

    private openAttachmentMenu(): void {
        if (!this.element || !this.uplodadButton?.element) return;

        this.attachmentMenu = document.createElement('div');
        this.attachmentMenu.className = 'message-input__attachment-menu';
        this.attachmentMenu.innerHTML = `
            <button type="button" class="message-input__attachment-menu-item" data-action="media">Фото или видео</button>
            <button type="button" class="message-input__attachment-menu-item" data-action="file">Файл</button>
            <button type="button" class="message-input__attachment-menu-item" data-action="contact">Контакт</button>
        `;
        this.attachmentMenu.addEventListener('click', this.handleAttachmentMenuClick);
        this.element.appendChild(this.attachmentMenu);

        const anchor = this.uplodadButton.element.getBoundingClientRect();
        const root = this.element.getBoundingClientRect();
        this.attachmentMenu.style.right = `${Math.max(0, root.right - anchor.right)}px`;
        this.attachmentMenu.style.bottom = `${root.bottom - anchor.top + 8}px`;
    }

    private closeAttachmentMenu(): void {
        this.attachmentMenu?.removeEventListener('click', this.handleAttachmentMenuClick);
        this.attachmentMenu?.remove();
        this.attachmentMenu = null;
    }

    private handleAttachmentMenuClick = (event: Event): void => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        this.closeAttachmentMenu();

        if (action === 'media') {
            this.mediaInput?.click();
            return;
        }

        if (action === 'file') {
            this.fileInput?.click();
            return;
        }

        if (action === 'contact') {
            void this.openContactPicker();
        }
    };

    private handleFileInputChange = (): void => {
        const file = this.fileInput?.files?.[0];
        if (this.fileInput) this.fileInput.value = '';
        if (!file) return;
        void this.attachUpload(file, 'file');
    };

    private handleMediaInputChange = (): void => {
        const file = this.mediaInput?.files?.[0];
        if (this.mediaInput) this.mediaInput.value = '';
        if (!file) return;

        const type = this.detectMediaAttachmentType(file);
        if (!type) {
            this.showInlineError('Можно прикрепить изображение JPEG, PNG, WebP, GIF или видео MP4, WebM, MOV');
            return;
        }

        void this.attachUpload(file, type);
    };

    private async attachUpload(file: File, type: UploadableAttachmentType): Promise<void> {
        if (!this.props.onUploadFile) {
            this.showInlineError('Загрузка вложений недоступна');
            return;
        }
        if (this.draftAttachments.length >= this.maxAttachments) {
            this.showInlineError('В одном сообщении можно отправить не больше 10 вложений');
            return;
        }
        if (!this.validateAttachment(file, type)) return;

        this.isUploading = true;
        this.updateSendButtonState();
        this.showInlineError(`Загружаем ${file.name}...`, false);

        try {
            const result = await this.props.onUploadFile(file, type);
            if (result.success === false) {
                if (result.status === 413) {
                    if (this.modalComponent) this.modalComponent.unmount();
                    this.modalComponent = new ConfirmModal({
                        text: 'Файл слишком большой для загрузки на сервер',
                        confirmButtonText: 'ОК',
                        hideCancel: true,
                        confirmButtonClass: 'confirm-modal__button--submit ui-button',
                        onConfirm: () => {
                            this.modalComponent?.unmount();
                            this.modalComponent = null;
                        },
                        onCancel: () => {
                            this.modalComponent?.unmount();
                            this.modalComponent = null;
                        }
                    });
                    this.modalComponent.mount(document.body);
                    this.clearInlineError();
                } else {
                    this.showInlineError(result.errorMessage);
                }
                return;
            }

            this.clearInlineError();
            this.draftAttachments.push({
                id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                attachment: result.attachment,
                outgoing: result.outgoing,
            });
            this.renderDraftAttachments();
            this.updateButtonsVisibility();
        } catch {
            this.showInlineError('Не удалось загрузить вложение. Попробуйте ещё раз');
        } finally {
            this.isUploading = false;
            this.updateSendButtonState();
        }
    }

    private detectMediaAttachmentType(file: File): Extract<MessageAttachmentType, 'photo' | 'video'> | null {
        if (file.type.startsWith('image/')) return 'photo';
        if (file.type.startsWith('video/')) return 'video';
        if (/\.(jpe?g|png|webp|gif)$/i.test(file.name)) return 'photo';
        if (/\.(mp4|webm|mov|qt)$/i.test(file.name)) return 'video';
        return null;
    }

    private validateAttachment(file: File, type: UploadableAttachmentType): boolean {
        if (file.size === 0) {
            this.showInlineError('Нельзя прикрепить пустой файл');
            return false;
        }

        if (type === 'voice') {
            if (file.size > 5 * 1024 * 1024) {
                this.showInlineError('Голосовое сообщение должно быть не больше 5 МиБ');
                return false;
            }
            return true;
        }

        if (type === 'photo') return this.validatePhotoAttachment(file);
        if (type === 'video') return this.validateVideoAttachment(file);
        return this.validateFileAttachment(file);
    }

    private validateFileAttachment(file: File): boolean {
        const allowedMimeTypes = new Set([
            'application/pdf',
            'application/zip',
            'application/x-zip-compressed',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ]);
        const allowedExtensions = /\.(pdf|zip|doc|docx|xls|xlsx|txt)$/i;
        const maxSize = 20 * 1024 * 1024;

        if (file.size > maxSize) {
            this.showInlineError('Файл должен быть не больше 20 МиБ');
            return false;
        }
        if (!allowedMimeTypes.has(file.type) && !allowedExtensions.test(file.name)) {
            this.showInlineError('Можно прикрепить PDF, ZIP, DOC/DOCX, XLS/XLSX или TXT');
            return false;
        }
        return true;
    }

    private validatePhotoAttachment(file: File): boolean {
        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
        const allowedExtensions = /\.(jpe?g|png|webp|gif)$/i;
        const maxSize = 10 * 1024 * 1024;

        if (file.size > maxSize) {
            this.showInlineError('Фото должно быть не больше 10 МиБ');
            return false;
        }
        if (!allowedMimeTypes.has(file.type) && !allowedExtensions.test(file.name)) {
            this.showInlineError('Можно прикрепить изображение JPEG, PNG, WebP или GIF');
            return false;
        }
        return true;
    }

    private validateVideoAttachment(file: File): boolean {
        const allowedMimeTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
        const allowedExtensions = /\.(mp4|webm|mov|qt)$/i;
        const maxSize = 50 * 1024 * 1024;

        if (file.size > maxSize) {
            this.showInlineError('Видео должно быть не больше 50 МиБ');
            return false;
        }
        if (!allowedMimeTypes.has(file.type) && !allowedExtensions.test(file.name)) {
            this.showInlineError('Можно прикрепить видео MP4, WebM или MOV');
            return false;
        }
        return true;
    }

    private renderDraftAttachments(): void {
        if (!this.draftAttachmentsContainer) return;
        this.draftAttachmentsContainer.textContent = '';
        this.draftAttachmentsContainer.hidden = this.draftAttachments.length === 0;

        this.draftAttachments.forEach((draft) => {
            const item = document.createElement('div');
            const type = draft.attachment.type;
            const isMedia = type === 'photo' || type === 'video';
            item.className = `message-input__draft-attachment message-input__draft-attachment--${isMedia ? 'media' : type}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'message-input__draft-attachment-remove';
            removeButton.setAttribute('aria-label', 'Удалить вложение');
            removeButton.addEventListener('click', () => {
                this.draftAttachments = this.draftAttachments.filter(d => d.id !== draft.id);
                this.renderDraftAttachments();
                this.updateButtonsVisibility();
            });
            const removeIcon = document.createElement('img');
            removeIcon.src = '/assets/images/icons/deleteIcon.svg';
            removeIcon.className = 'message-input__draft-attachment-remove-icon';
            removeButton.appendChild(removeIcon);

            if (isMedia) {
                item.classList.add('message-input__draft-attachment-media--loading');
                const img = document.createElement('img');
                img.className = 'message-input__draft-attachment-media';
                img.style.opacity = '0';
                img.style.transition = 'opacity 0.3s ease';
                img.src = draft.attachment.url || '';

                img.addEventListener('load', () => {
                    item.classList.remove('message-input__draft-attachment-media--loading');
                    img.style.opacity = '1';
                }, { once: true });

                img.addEventListener('error', () => {
                    item.classList.remove('message-input__draft-attachment-media--loading');
                    img.style.opacity = '1';
                    img.src = '/assets/images/icons/videoFallback.svg';
                    img.classList.add('message-input__draft-attachment-media--fallback');
                }, { once: true });

                item.append(img, removeButton);
            } else {
                const icon = document.createElement('img');
                icon.className = 'message-input__draft-attachment-icon';
                
                if (type === 'contact' && draft.attachment.contactAvatarUrl) {
                    icon.src = draft.attachment.contactAvatarUrl;
                    icon.style.borderRadius = '50%';
                    icon.style.objectFit = 'cover';
                    // Убираем фильтр инверсии, так как это реальная картинка
                    icon.style.filter = 'none';
                } else {
                    icon.src = type === 'contact' ? '/assets/images/icons/profile.svg' : '/assets/images/icons/upload.svg';
                }

                const name = document.createElement('span');
                name.className = 'message-input__draft-attachment-name';
                name.textContent = this.getDraftAttachmentLabel(draft.attachment);

                item.append(icon, name, removeButton);
            }

            this.draftAttachmentsContainer!.appendChild(item);
        });
    }

    private getDraftAttachmentLabel(attachment: MessageAttachment): string {
        switch (attachment.type) {
            case 'file':
                return attachment.fileName || 'Файл';
            case 'contact':
                return [attachment.contactFirstName, attachment.contactLastName].filter(Boolean).join(' ') || 'Контакт';
            default:
                return 'Вложение';
        }
    }

    private async openContactPicker(): Promise<void> {
        if (this.editingMessageId) {
            this.showInlineError('Завершите редактирование сообщения перед добавлением вложений');
            return;
        }
        if (this.draftAttachments.length >= this.maxAttachments) {
            this.showInlineError('В одном сообщении можно отправить не больше 10 вложений');
            return;
        }
        if (!this.props.onLoadContacts) {
            this.showInlineError('Список контактов недоступен');
            return;
        }

        this.closeContactPicker();
        this.contactPickerRequestId += 1;
        const requestId = this.contactPickerRequestId;

        const overlay = document.createElement('div');
        overlay.className = 'message-input__contact-picker-overlay';
        overlay.innerHTML = `
            <div class="message-input__contact-picker" role="dialog" aria-modal="true" aria-label="Выбор контакта">
                <div class="message-input__contact-picker-header">
                    <span class="message-input__contact-picker-title">Выберите контакт</span>
                    <button type="button" class="message-input__contact-picker-close" aria-label="Закрыть">×</button>
                </div>
                <input class="message-input__contact-picker-search" type="search" placeholder="Поиск" autocomplete="off">
                <div class="message-input__contact-picker-list" data-component="contact-picker-list">
                    <p class="message-input__contact-picker-state">Загружаем контакты...</p>
                </div>
            </div>
        `;

        overlay.addEventListener('click', this.handleContactPickerClick);
        document.body.appendChild(overlay);
        this.contactPickerOverlay = overlay;

        const input = overlay.querySelector<HTMLInputElement>('.message-input__contact-picker-search');
        input?.addEventListener('input', this.handleContactPickerSearch);
        input?.focus({ preventScroll: true });

        try {
            const contacts = await this.props.onLoadContacts();
            if (requestId !== this.contactPickerRequestId || this.contactPickerOverlay !== overlay) return;
            this.contactPickerContacts = contacts;
            this.renderContactPickerList(contacts);
        } catch {
            if (requestId !== this.contactPickerRequestId || this.contactPickerOverlay !== overlay) return;
            this.renderContactPickerState('Не удалось загрузить контакты');
        }
    }

    private closeContactPicker(): void {
        this.contactPickerRequestId += 1;
        const input = this.contactPickerOverlay?.querySelector<HTMLInputElement>('.message-input__contact-picker-search');
        input?.removeEventListener('input', this.handleContactPickerSearch);
        this.contactPickerOverlay?.removeEventListener('click', this.handleContactPickerClick);
        this.contactPickerOverlay?.remove();
        this.contactPickerOverlay = null;
        this.contactPickerContacts = [];
    }

    private handleContactPickerClick = (event: Event): void => {
        if (event.target === this.contactPickerOverlay) {
            this.closeContactPicker();
            return;
        }

        const target = event.target as HTMLElement;
        if (target.closest('.message-input__contact-picker-close')) {
            this.closeContactPicker();
            return;
        }

        const item = target.closest<HTMLButtonElement>('[data-contact-id]');
        if (!item) return;

        const contactId = Number(item.dataset.contactId);
        const contact = this.contactPickerContacts.find(contact => contact.contact_user_id === contactId);
        if (!contact) return;

        this.attachContact(contact);
    };

    private handleContactPickerSearch = (event: Event): void => {
        const query = ((event.target as HTMLInputElement).value || '').trim().toLowerCase();
        if (!query) {
            this.renderContactPickerList(this.contactPickerContacts);
            return;
        }

        const filtered = this.contactPickerContacts.filter(contact =>
            contact.contact_name.toLowerCase().includes(query)
            || String(contact.contact_user_id).includes(query)
        );
        this.renderContactPickerList(filtered);
    };

    private renderContactPickerList(contacts: FrontendContact[]): void {
        if (contacts.length === 0) {
            this.renderContactPickerState('Контакты не найдены');
            return;
        }

        const list = this.contactPickerOverlay?.querySelector<HTMLElement>('[data-component="contact-picker-list"]');
        if (!list) return;
        list.textContent = '';

        contacts.forEach((contact) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'message-input__contact-picker-item';
            item.dataset.contactId = String(contact.contact_user_id);

            const avatar = document.createElement('img');
            avatar.className = 'message-input__contact-picker-avatar';
            avatar.src = contact.avatarURL || '/assets/images/avatars/defaultAvatar.svg';
            avatar.alt = '';

            const name = document.createElement('span');
            name.className = 'message-input__contact-picker-name';
            name.textContent = contact.contact_name || `User #${contact.contact_user_id}`;

            item.append(avatar, name);
            list.appendChild(item);
        });
    }

    private renderContactPickerState(text: string): void {
        const list = this.contactPickerOverlay?.querySelector<HTMLElement>('[data-component="contact-picker-list"]');
        if (!list) return;
        list.textContent = '';
        const state = document.createElement('p');
        state.className = 'message-input__contact-picker-state';
        state.textContent = text;
        list.appendChild(state);
    }

    private attachContact(contact: FrontendContact): void {
        if (this.draftAttachments.length >= this.maxAttachments) {
            this.showInlineError('В одном сообщении можно отправить не больше 10 вложений');
            return;
        }

        const name = contact.contact_name || `User #${contact.contact_user_id}`;
        const attachment: MessageAttachment = {
            type: 'contact',
            contactUserId: contact.contact_user_id,
            contactFirstName: name,
            contactAvatarUrl: contact.avatarURL,
        };

        this.draftAttachments.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            attachment,
            outgoing: {
                type: 'contact',
                contact_user_id: contact.contact_user_id,
            },
        });
        this.renderDraftAttachments();
        this.clearInlineError();
        this.closeContactPicker();
        this.updateButtonsVisibility();
    }

    private showInlineError(message: string, isError = true): void {
        if (!this.errorElement) return;
        this.errorElement.textContent = message;
        this.errorElement.hidden = false;
        this.errorElement.classList.toggle('message-input__error--muted', !isError);
    }

    private clearInlineError(): void {
        if (!this.errorElement) return;
        this.errorElement.textContent = '';
        this.errorElement.hidden = true;
        this.errorElement.classList.remove('message-input__error--muted');
    }

    private updateSendButtonState(): void {
        if (this.sendButton) this.sendButton.disabled = this.isUploading;
    }

    private handleStickerButtonClick = (event: MouseEvent): void => {
        event.preventDefault();
        if (this.stickerOverlay) {
            this.closeStickerOverlay();
        } else {
            this.openStickerOverlay();
        }
    };

    private openStickerOverlay(): void {
        if (this.stickerOverlay || !this.stikerButton?.element) return;

        const anchorEl = this.stikerButton.element;
        const anchorRect = anchorEl.getBoundingClientRect();
        this.stickerOverlay = new StickerEmojiOverlay({
            anchorRect,
            anchorElement: anchorEl,
            initialTab: 'stickers',
            onSelectSticker: (sticker) => {
                this.props.onSendSticker?.(sticker);
                this.closeStickerOverlay();
            },
            onSelectEmoji: (emoji) => {
                this.insertAtCursor(emoji);
            },
            onClose: () => this.closeStickerOverlay(),
        });
        this.stickerOverlay.mount(document.body);
        this.stikerButton.element.classList.add('message-input__sticker-button--active');
    }

    private closeStickerOverlay(): void {
        if (!this.stickerOverlay) return;
        this.stickerOverlay.unmount();
        this.stickerOverlay = null;
        this.stikerButton?.element?.classList.remove('message-input__sticker-button--active');
    }

    private insertAtCursor(text: string): void {
        if (!this.textarea) return;
        const start = this.textarea.selectionStart ?? this.textarea.value.length;
        const end = this.textarea.selectionEnd ?? this.textarea.value.length;
        const before = this.textarea.value.slice(0, start);
        const after = this.textarea.value.slice(end);
        this.textarea.value = before + text + after;
        const caret = start + text.length;
        this.textarea.focus({ preventScroll: true });
        this.textarea.setSelectionRange(caret, caret);
        // авто-ресайз
        this.textarea.style.height = '';
        this.textarea.style.height = `${this.textarea.scrollHeight}px`;
        this.props.onTyping?.();
        this.updateButtonsVisibility();
    }

    private showEditIndicator(currentText: string): void {
        if (!this.element || this.editIndicator) return;

        this.editIndicator = document.createElement('div');
        this.editIndicator.className = 'message-input__edit-indicator';
        this.editIndicator.innerHTML = `
            <img class="message-input__edit-indicator-icon" src="/assets/images/icons/editMsgOverlayIcons/editPencil.svg" alt="" aria-hidden="true">
            <div class="message-input__edit-indicator-text">
                <span class="message-input__edit-indicator-title">Редактирование</span>
                <span class="message-input__edit-indicator-preview"></span>
            </div>
            <button type="button" class="message-input__edit-cancel" aria-label="Отменить редактирование">
                <img src="/assets/images/icons/editMsgOverlayIcons/cnacelEditBtn.svg" alt="" aria-hidden="true">
            </button>
        `;

        const previewEl = this.editIndicator.querySelector('.message-input__edit-indicator-preview');
        if (previewEl) previewEl.textContent = currentText;

        this.element.prepend(this.editIndicator);

        this.cancelEditButton = this.editIndicator.querySelector('.message-input__edit-cancel');
        this.cancelEditButton?.addEventListener('click', this.handleCancelEdit);
    }

    private setSendButtonIcon(src: string): void {
        const img = this.sendButton?.element?.querySelector('img');
        if (img) img.src = src;
    }

    private hideEditIndicator(): void {
        this.cancelEditButton?.removeEventListener('click', this.handleCancelEdit);
        this.cancelEditButton = null;
        this.editIndicator?.remove();
        this.editIndicator = null;
    }

    public enterEditMode(messageId: string, currentText: string): void {
        this.editingMessageId = messageId;
        if (this.textarea) {
            this.textarea.value = currentText;
            this.textarea.focus({ preventScroll: true });
            this.textarea.style.height = '';
            this.textarea.style.height = `${this.textarea.scrollHeight}px`;
        }
        this.setSendButtonIcon('/assets/images/icons/editMsgOverlayIcons/editMsgBtn.svg');
        this.showEditIndicator(currentText);
        this.updateButtonsVisibility();
    };

    public exitEditMode(): void {
        this.editingMessageId = null;
        if (this.textarea) {
            this.textarea.value = '';
            this.textarea.style.height = '';
        }
        this.setSendButtonIcon('/assets/images/icons/sendIcon.svg');
        this.hideEditIndicator();
        this.updateButtonsVisibility();
    };

    public showSendError(message: string): void {
        this.showInlineError(message);
    }

    /**
     * Обработчик нажатия клавиш в текстовой области.
     * @param {KeyboardEvent} event - Событие клавиатуры.
     * @private
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.form?.requestSubmit();
        }
    };

    private handleInput = (): void => {
        if (this.textarea) {
            this.textarea.style.height = '';
            this.textarea.style.height = `${this.textarea.scrollHeight}px`;
        }
        this.props.onTyping?.();
        this.updateButtonsVisibility();
    };

    private isMobileViewport(): boolean {
        return window.matchMedia(this.mobileQuery).matches;
    }

    private handleSendPointerDown = (event: Event): void => {
        if (document.activeElement === this.textarea) {
            event.preventDefault();
        }
    };

    private handleDocumentPointerDown = (event: PointerEvent): void => {
        const target = event.target;
        if (this.attachmentMenu && target instanceof Node) {
            const clickedInsideMenu = this.attachmentMenu.contains(target);
            const clickedUploadButton = Boolean(this.uplodadButton?.element?.contains(target));
            if (!clickedInsideMenu && !clickedUploadButton) {
                this.closeAttachmentMenu();
            }
        }

        if (!this.isMobileViewport() || !this.textarea || document.activeElement !== this.textarea) {
            return;
        }

        if (target instanceof Node && this.element?.contains(target)) {
            return;
        }
        // Не блюрим, если кликнули внутрь открытого стикер-оверлея.
        if (target instanceof Node && this.stickerOverlay?.element?.contains(target)) {
            return;
        }

        this.textarea.blur();
    };

    private handleDocumentKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            this.closeAttachmentMenu();
            this.closeContactPicker();
        }
    };

    /**
     * Переопределяем метод onSubmit из BaseForm.
     * @param {{messageText: string}} data - Данные формы.
     * @returns {Promise<void>}
     */
    protected async onSubmit(data: { messageText: string }): Promise<void> {
        if (this.voiceRecorder) {
            this.voiceRecorder.finishRecording();
            return;
        }
        const text = data.messageText?.trim();
        const attachments = this.draftAttachments.map(item => item.outgoing);
        const attachmentModels = this.draftAttachments.map(item => item.attachment);
        if (!text && attachments.length === 0) return;
        if (this.isUploading) {
            this.showInlineError('Дождитесь окончания загрузки вложения');
            return;
        }

        if (text.length > 2000) {
            if (this.modalComponent) this.modalComponent.unmount();
            this.modalComponent = new ConfirmModal({
                text: `Уменьшите сообщение до 2000 символов (сейчас ${text.length})`,
                confirmButtonText: "Понятно",
                hideCancel: true,
                confirmButtonClass: "confirm-modal__button--submit ui-button",
                onConfirm: () => {
                    this.modalComponent?.unmount();
                    this.modalComponent = null;
                },
                onCancel: () => {
                    this.modalComponent?.unmount();
                    this.modalComponent = null;
                }
            });
            this.modalComponent.mount(document.body);
            return;
        }

        if (this.editingMessageId) {
            this.props.onSubmitEdit?.(this.editingMessageId, text);
            this.props.onStopTyping?.();
            this.exitEditMode();
        } else {
            try {
                await this.props.onSubmit(text, attachments, attachmentModels);
                this.props.onStopTyping?.();
                this.draftAttachments = [];
                this.renderDraftAttachments();
                this.clearInlineError();
                if (this.textarea) {
                    this.textarea.value = '';
                    this.textarea.style.height = '';
                }
                this.updateButtonsVisibility();
            } catch {
                // Ошибка отправки: показываем пользователю, не сбрасываем черновик
                this.showInlineError('Не удалось отправить сообщение. Попробуйте ещё раз');
            }
        }

        this.textarea?.focus({ preventScroll: true });
    }

    protected beforeUnmount(): void {
        this.closeStickerOverlay();
        this.exitEditMode();
        if (this.textarea) {
            this.textarea.removeEventListener('keydown', this.handleKeyDown);
            this.textarea.removeEventListener('input', this.handleInput);
        }
        document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
        document.removeEventListener('keydown', this.handleDocumentKeyDown);
        this.props.onStopTyping?.();
        this.closeAttachmentMenu();
        this.closeContactPicker();
        this.fileInput?.removeEventListener('change', this.handleFileInputChange);
        this.fileInput?.remove();
        this.mediaInput?.removeEventListener('change', this.handleMediaInputChange);
        this.mediaInput?.remove();
        
        this.sendButton?.element?.removeEventListener('pointerdown', this.handleSendPointerDown);
        this.sendButton?.element?.removeEventListener('mousedown', this.handleSendPointerDown);
        if (this.voiceRecorder) {
            this.voiceRecorder.unmount();
            this.voiceRecorder = null;
        }

        this.modalComponent?.unmount();

        super.beforeUnmount();
        this.stikerButton?.unmount();
        this.uplodadButton?.unmount();
        this.sendButton?.unmount();

        this.textarea = null;
        this.stikerButton = null;
        this.uplodadButton = null;
        this.sendButton = null;
        this.fileInput = null;
        this.mediaInput = null;
        this.draftAttachmentsContainer = null;
        this.errorElement = null;
        this.draftAttachments = [];
    }
}
