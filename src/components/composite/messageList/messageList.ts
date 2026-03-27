import { BaseComponent } from '../../../core/base/baseComponent.js';
import { FrontendMessage, User} from '../../../types/chat.js';
import { Message } from '../../ui/message/message.js';

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
    private flexContainer: HTMLElement | null = null;

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

        this.flexContainer = this.element.querySelector('.message-list__flex-container'); 
        if (!this.flexContainer) {
            console.error("MessageList: flex-container не найден.");
            return;
        }

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


        messages.forEach(msgData => {
            const isOwn = msgData.sender.login == this.props.currentUser.login;
            const messageComponent = new Message({ message: msgData, isOwn: isOwn });
            messageComponent.mount(this.flexContainer!);
            this.childMessages.push(messageComponent);
        });
    }

    /**
     * Добавляет новое сообщение в список и прокручивает вниз.
     * @param {MessageType} newMessage - Новое сообщение.
     */
    public addMessage(newMessage: FrontendMessage): void {
        if (!this.element) {
            console.error("MessageList: контейнер для сообщений не найден при добавлении сообщения.");
            return;
        }

        const isOwn = newMessage.sender.login === this.props.currentUser.login;
        const messageComponent = new Message({ message: newMessage, isOwn: isOwn });
        
        messageComponent.mount(this.flexContainer!);
        this.childMessages.push(messageComponent);
        this.scrollToBottom();
    }

    /**
     * Прокручивает список сообщений до конца.
     */
    private scrollToBottom(): void {
        this.element?.scrollTo({ top: this.element.scrollHeight, behavior: 'smooth' });
    }

    /**
     * @override
     */
    beforeUnmount() {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];
    }
}