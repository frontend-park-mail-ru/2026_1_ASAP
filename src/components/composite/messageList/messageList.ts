import { BaseComponent } from '../../../core/base/baseComponent.js';
import { Message as MessageType, User } from '../../../types/chat.js';
import { Message } from '../../ui/message/message.js';

/**
 * @interface MessageListProps - Свойства компонента списка сообщений.
 * @property {MessageType[]} messages - Массив сообщений.
 * @property {User} currentUser - Текущий пользователь (для определения isOwn).
 */
interface MessageListProps {
    messages: MessageType[];
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
        this.tempName = 'components/composite/messageList/messageList';
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
    private renderMessages(messages: MessageType[]): void {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];

        const container = this.scrollContainer;
        if (!container) return;

        messages.forEach(msgData => {
            const isOwn = msgData.sender.id === this.props.currentUser.id;
            const messageComponent = new Message({ message: msgData, isOwn: isOwn });
            messageComponent.mount(container);
            this.childMessages.push(messageComponent);
        });
    }

    /**
     * Добавляет новое сообщение в список и прокручивает вниз.
     * @param {MessageType} newMessage - Новое сообщение.
     */
    addMessage(newMessage: MessageType): void {
        const isOwn = newMessage.sender.id === this.props.currentUser.id;
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