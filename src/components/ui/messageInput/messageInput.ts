import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm'; 
import { Button } from '../button/button';
import { Input } from '../input/input';
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
    private messageInput: Input | null = null;
    private uplodadButton: Button | null = null;
    private stikerButton: Button | null = null;
    private sendButton: Button | null = null;

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

        const stikerButtonContainer = this.element.querySelector('[data-component="message-text-input"]');
        this.stikerButton = new Button({
            label: '',
            icon: '/assets/images/icons/sticker.svg',
            class: 'message-input__sticker-button',
            type: 'button',
        });
        this.stikerButton.mount(stikerButtonContainer as HTMLElement);

        
        const messageInputContainer = this.element.querySelector('[data-component="message-text-input"]');
        this.messageInput = new Input({
            name: 'messageText',
            placeholder: 'Введите сообщение...',
            type: 'text',
            class: 'message-input__textarea',
            showErrorText: false,
        });
        this.messageInput.mount(messageInputContainer as HTMLElement);


        const uploadButtonContainer = this.element.querySelector('[data-component="message-text-input"]');
        this.uplodadButton = new Button({
            label: '',
            icon: '/assets/images/icons/upload.svg',
            class: 'message-input__upload-button-container',
            type: 'button',
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
     * Переопределяем метод onSubmit из BaseForm.
     * @param {{messageText: string}} data - Данные формы.
     * @returns {Promise<void>}
     */
    protected async onSubmit(data: { messageText: string }): Promise<void> { 
        const text = data.messageText.trim();
        if (text) {
            this.props.onSubmit(text);
            if (this.messageInput) {
                this.messageInput.value = '';
            }
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void { 
        super.beforeUnmount();
        this.messageInput?.unmount();
        this.sendButton?.unmount();
        this.messageInput = null;
        this.sendButton = null;
    }
}