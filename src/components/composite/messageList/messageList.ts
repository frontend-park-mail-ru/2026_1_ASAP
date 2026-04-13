import { BaseComponent } from '../../../core/base/baseComponent';
import { FrontendMessage, User, Chat} from '../../../types/chat';
import { Message } from '../../ui/message/message';
import template from './messageList.hbs';

/**
 * @interface MessageListProps - Свойства компонента списка сообщений.
 * @property {FrontendMessage[]} messages - Массив сообщений.
 * @property {User} currentUser - Текущий пользователь (для определения isOwn).
 * @property {Chat['type']} chatType - Тип текущего чата. 
 * @property {() => Promise<void>} [onLoadMore] - Колбэк для подгрузки старых сообщений.
*/
interface MessageListProps {
    messages: FrontendMessage[];
    currentUser: User;
    chatType: Chat['type'];
    onLoadMore?: () => Promise<void>;
}

/**
 * Компонент для отображения списка сообщений в диалоге.
 */
export class MessageList extends BaseComponent {
    private childMessages: Message[] = [];
    private flexContainer: HTMLElement | null = null;
    private emptyStateElement: HTMLElement | null = null;
    private isLoadingMore = false;

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
     * Обработчик скролла для подгрузки истории.
     * @private
     */
    private handleScroll = async () => {
        if (!this.element || this.isLoadingMore) return;
        

        const { scrollTop, scrollHeight, clientHeight } = this.element;
        if (scrollTop + clientHeight >= scrollHeight - 10 && this.props.onLoadMore) {
            this.isLoadingMore = true;
            await this.props.onLoadMore();
            this.isLoadingMore = false;
        }
    };

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

        this.element.addEventListener('scroll', this.handleScroll);

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

        // В column-reverse новые сообщения должны быть первыми в DOM (визуальный низ).
        messages.forEach(msgData => {
            if (msgData.isOwn && this.props.currentUser?.avatarUrl) {
                msgData.sender.avatarUrl = this.props.currentUser.avatarUrl;
            }
            const messageComponent = new Message({
                message: msgData, 
                isOwn: msgData.isOwn || false,
                showAuthor: showAuthor
            });
            messageComponent.mount(this.flexContainer!);
            if (messageComponent.element) {
                this.flexContainer!.prepend(messageComponent.element);
            }
            this.childMessages.unshift(messageComponent);
        });
        this.scrollToBottom();
    }

    /**
     * Добавляет новые сообщения в начало списка без скачков скролла.
     * @param {FrontendMessage[]} messages - Массив старых сообщений.
     */
    public prependMessages(messages: FrontendMessage[]): void {
        if (!this.element || !this.flexContainer || messages.length === 0) return;

        const fragment = document.createDocumentFragment();
        const newComponents: Message[] = [];

        const showAuthor = this.props.chatType === 'group';

        messages.forEach(msgData => {
            const comp = new Message({ 
                message: msgData, 
                isOwn: msgData.isOwn || false, 
                showAuthor 
            });
            const tempDiv = document.createElement('div');
            comp.mount(tempDiv);
            if (comp.element) fragment.appendChild(comp.element);
            newComponents.push(comp);
        });

        this.flexContainer.appendChild(fragment);
        this.childMessages = [...this.childMessages, ...newComponents];
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
        if (newMessage.isOwn && this.props.currentUser?.avatarUrl) {
            newMessage.sender.avatarUrl = this.props.currentUser.avatarUrl;
        }
        const messageComponent = new Message({
            message: newMessage, 
            isOwn: newMessage.isOwn || false,
            showAuthor: showAuthor
        });
        
        // Новое сообщение всегда в начало DOM (визуальный низ)
        messageComponent.mount(this.flexContainer!);
        if (messageComponent.element) {
            this.flexContainer!.prepend(messageComponent.element);
        }
        this.childMessages.unshift(messageComponent);
        this.scrollToBottom();
    }

    /**
     * Прокручивает список сообщений до конца.
     * Используется setTimeout, чтобы дать браузеру время отрисовать новые элементы
     * и обновить scrollHeight контейнера.
     */
    public scrollToBottom(): void {
        if (this.element) {
            this.element.scrollTop = 0;
        }
    }

    /**
     * @override
     */
    beforeUnmount() {
        if (this.element) {
            this.element.removeEventListener('scroll', this.handleScroll);
        }
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];
    }
}
