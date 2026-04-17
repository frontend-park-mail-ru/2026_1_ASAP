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
}

/**
 * Компонент формы для ввода и отправки текстовых сообщений.
 */
export class MessageInput extends BaseForm<MessageInputProps> { 
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
        
        if (text) {
            if (text.length > 2000) {
                if (this.modalComponent) {
                    this.modalComponent.unmount();
                }
                
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

            this.props.onSubmit(text);
            if (this.textarea) {
                this.textarea.value = '';
                this.textarea.style.height = ''; // Сброс высоты после отправки
            }
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void { 
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