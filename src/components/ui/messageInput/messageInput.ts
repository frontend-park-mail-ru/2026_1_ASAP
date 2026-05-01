import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm'; 
import { Button } from '../button/button';
import { ConfirmModal } from '../../composite/confirmModal/confirmModal';
import template from './messageInput.hbs';

/**
 * @interface MessageInputProps - Свойства компонента формы ввода сообщения.
 * @property {Function} onSubmit - Колбэк, вызываемый при отправке сообщения. Принимает текст сообщения.
 */
interface MessageInputProps extends IBaseFormProps { 
    onSubmit: (text: string) => void;
    onSubmitEdit?: (messageId: string, text: string) => void;
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
    private modalComponent: ConfirmModal | null = null;

    /**
     * @param {MessageInputProps} props - Свойства компонента.
     */
    constructor(props: MessageInputProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    /**
     * @override
     */
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
            title: 'В разработке',
        });
        this.stikerButton.mount(stickerButtonContainer as HTMLElement);

        this.textarea = this.element.querySelector('.message-input__textarea') as HTMLTextAreaElement;
        if (this.textarea) {
            this.textarea.addEventListener('keydown', this.handleKeyDown);
            this.textarea.addEventListener('input', this.handleInput);
        }

        const uploadButtonContainer = this.element.querySelector('[data-component="upload-button-container"]');
        this.uplodadButton = new Button({
            label: '',
            icon: '/assets/images/icons/upload.svg',
            class: 'message-input__upload-button-container',
            type: 'button',
            title: 'В разработке',
        });
        this.uplodadButton.mount(uploadButtonContainer as HTMLElement);

        const sendButtonContainer = this.element.querySelector('[data-component="send-button-container"]');
        this.sendButton = new Button({
            label: '',
            icon: '/assets/images/icons/sendIcon.svg',
            class: 'message-input__send-button',
            type: 'submit',
        });
        this.sendButton.mount(sendButtonContainer as HTMLElement);

        this.textarea?.focus({ preventScroll: true });
    }

    private handleCancelEdit = (): void => {
        this.exitEditMode();
    };

    private showEditIndicator(): void {
        if (!this.element || this.editIndicator) return;

        this.editIndicator = document.createElement('div');
        this.editIndicator.className = 'message-input__edit-indicator';
        this.editIndicator.innerHTML = `
            <span>Редактирование сообщения</span>
            <button type="button" class="message-input__edit-cancel" aria-label="Отменить редактирование">×</button>
        `;
        this.element.prepend(this.editIndicator);

        this.cancelEditButton = this.editIndicator.querySelector('.message-input__edit-cancel');
        this.cancelEditButton?.addEventListener('click', this.handleCancelEdit);
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
        this.showEditIndicator();
    };

    public exitEditMode(): void {
        this.editingMessageId = null;
        if (this.textarea) {
            this.textarea.value = '';
            this.textarea.style.height = '';
        }
        this.hideEditIndicator();
    };

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

    /**
     * Обработчик ввода текста для автоматического изменения высоты.
     * @private
     */
    private handleInput = (): void => {
        if (this.textarea) {
            this.textarea.style.height = '';
            this.textarea.style.height = `${this.textarea.scrollHeight}px`;
        }
    };

    /**
     * Переопределяем метод onSubmit из BaseForm.
     * @param {{messageText: string}} data - Данные формы.
     * @returns {Promise<void>}
     */
    protected async onSubmit(data: { messageText: string }): Promise<void> { 
        const text = data.messageText?.trim();
        if (!text) return;

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
            this.exitEditMode();
        } else {
            this.props.onSubmit(text);
            if (this.textarea) {
                this.textarea.value = '';
                this.textarea.style.height = '';
            }
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void { 
        this.exitEditMode();
        if (this.textarea) {
            this.textarea.removeEventListener('keydown', this.handleKeyDown);
            this.textarea.removeEventListener('input', this.handleInput);
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
    }
}