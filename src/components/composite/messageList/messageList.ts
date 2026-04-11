import { BaseComponent } from '../../../core/base/baseComponent';
import { FrontendMessage, User, Chat} from '../../../types/chat';
import { Message } from '../../ui/message/message';
import template from './messageList.hbs';

/**
 * @interface MessageListProps - Свойства компонента списка сообщений.
 * @property {MessageType[]} messages - Массив сообщений.
 * @property {User} currentUser - Текущий пользователь (для определения isOwn).
 * @property {'dialog' | 'group' | 'channel'} chatType - Тип текущего чата. 
*/
interface MessageListProps {
    messages: FrontendMessage[];
    currentUser: User;
    chatType: Chat['type'];
}

/**
 * Компонент для отображения списка сообщений в диалоге.
 */
export class MessageList extends BaseComponent {
    private childMessages: Message[] = [];
    private flexContainer: HTMLElement | null = null;
    private emptyStateElement: HTMLElement | null = null;

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

        this.flexContainer = this.element.querySelector('.message-list__flex-container'); 
        this.emptyStateElement = this.element.querySelector('.message-list__empty-state');

        if (!this.flexContainer) {
            console.error("MessageList: flex-container не найден.");
            return;
        }

        this.setMessages(this.props.messages);
        this.scrollToBottom();
    }

    /**
     * Рендерит сообщения в список (полная замена текущих сообщений).
     * @param {FrontendMessage[]} messages - Массив сообщений для отображения.
     */
    public setMessages(messages: FrontendMessage[]): void {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];

        const showAuthor = this.props.chatType === 'group';

        if (messages.length === 0) {
            if (this.emptyStateElement) this.emptyStateElement.style.display = 'flex';
            if (this.flexContainer) this.flexContainer.style.display = 'none';
        } else {
            if (this.emptyStateElement) this.emptyStateElement.style.display = 'none';
            if (this.flexContainer) this.flexContainer.style.display = 'flex';
        }

        messages.forEach(msgData => {
            const messageComponent = new Message({
                message: msgData, 
                isOwn: msgData.isOwn || false,
                showAuthor: showAuthor
            });
            messageComponent.mount(this.flexContainer!);
            this.childMessages.push(messageComponent);
        });
    }

    /**
     * Добавляет новое сообщение в список и прокручивает вниз.
     * @param {FrontendMessage} newMessage - Новое сообщение.
     */
    public addMessage(newMessage: FrontendMessage): void {
        if (!this.element) {
            console.error("MessageList: контейнер для сообщений не найден при добавлении сообщения.");
            return;
        }

        if (this.emptyStateElement) {
            this.emptyStateElement.style.display = 'none';
        }
        if (this.flexContainer) {
            this.flexContainer.style.display = 'flex';
        }

        const showAuthor = this.props.chatType === 'group';
        const messageComponent = new Message({
            message: newMessage, 
            isOwn: newMessage.isOwn || false,
            showAuthor: showAuthor
        });
        
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