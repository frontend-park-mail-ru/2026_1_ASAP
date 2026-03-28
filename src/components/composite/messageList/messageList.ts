import { BaseComponent } from '../../../core/base/baseComponent';
import { FrontendMessage, User} from '../../../types/chat';
import { Message } from '../../ui/message/message';
import template from './messageList.hbs';

/**
 * @interface MessageListProps - Свойства компонента списка сообщений.
 * @property {MessageType[]} messages - Массив сообщений.
 * @property {User} currentUser - Текущий пользователь (для определения isOwn).
 */
interface MessageListProps {
    messages: FrontendMessage[];
    currentUser: User;
}

/**
 * Компонент для отображения списка сообщений в диалоге.
 */
export class MessageList extends BaseComponent {
    private childMessages: Message[] = [];
    private scrollContainer: HTMLElement | null = null;

    /**
     * @param {MessageListProps} props - Свойства компонента.
     */
    constructor(props: MessageListProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    /**
     * @override
     */
    afterMount() {
        if (!this.element) {
            console.error("MessageList: компонент не имеет элемента при afterMount.");
            return;
        }
        this.scrollContainer = this.element.querySelector('.message-list__container');
        this.renderMessages(this.props.messages);
        this.scrollToBottom();
    }

    /**
     * Рендерит сообщения в список.
     * @param {MessageType[]} messages - Массив сообщений для отображения.
     */
    private renderMessages(messages: FrontendMessage[]): void {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];

        const container = this.scrollContainer;
        if (!container) {
            console.error("MessageList: контейнер для сообщений не найден.");
            return;
        }

        messages.forEach(msgData => {
            const isOwn = msgData.sender.login == this.props.currentUser.login;
            const messageComponent = new Message({ message: msgData, isOwn: isOwn });
            messageComponent.mount(container);
            this.childMessages.push(messageComponent);
        });
    }

    /**
     * Добавляет новое сообщение в список и прокручивает вниз.
     * @param {MessageType} newMessage - Новое сообщение.
     */
    addMessage(newMessage: FrontendMessage): void {
        const isOwn = newMessage.sender.login === this.props.currentUser.login;
        const messageComponent = new Message({ message: newMessage, isOwn: isOwn });
        const container = this.scrollContainer;
        
        if (container) {
            messageComponent.mount(container);
            this.childMessages.push(messageComponent);
            this.scrollToBottom();
        }
    }

    /**
     * Прокручивает список сообщений до конца.
     */
    private scrollToBottom(): void {
        if (this.scrollContainer) {
            this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
        }
    }

    /**
     * @override
     */
    beforeUnmount() {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];
    }
}