import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm.js'; 
import { Button } from '../button/button.js';
import { Input } from '../input/input.js';

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
    private sendButton: Button | null = null;

    /**
     * @param {MessageInputProps} props - Свойства компонента.
     */
    constructor(props: MessageInputProps) {
        super(props);
        this.tempName = 'components/ui/messageInput/messageInput';
    }

    /**
     * @override
     */
    protected afterMount(): void { 
        super.afterMount();

        if (!this.element) {
            console.error("MessageInput: Component element is null during afterMount.");
            return;
        }
        const messageInputContainer = this.element.querySelector('[data-component="message-text-input"]');

        if (!messageInputContainer) {
            console.error("MessageInput: Could not find message-text-input container.");
            return;
        }
        this.messageInput = new Input({
            name: 'messageText',
            placeholder: 'Введите сообщение...',
            type: 'text',
            class: 'message-input__textarea',
            showErrorText: false,
        });
        this.messageInput.mount(messageInputContainer as HTMLElement);

        const sendButtonContainer = this.element.querySelector('[data-component="send-button-container"]');
        if (!sendButtonContainer) {
            console.error("MessageInput: Could not find send-button-container.");
            return;
        }
        this.sendButton = new Button({
            label: '',
            icon: '/assets/images/icons/sendIcon.svg',
            class: 'message-input__send-button ui-button ui-button__primary',
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