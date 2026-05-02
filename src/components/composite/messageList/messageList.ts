import { BaseComponent } from '../../../core/base/baseComponent';
import { FrontendMessage, User, Chat} from '../../../types/chat';
import { Message } from '../../ui/message/message';
import template from './messageList.hbs';
import { wsClient } from '../../../core/utils/wsClient';
import { getFullUrl } from '../../../core/utils/url';

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
    onRequestEdit?: (messageId: string, currentText: string) => void;
}

/**
 * Компонент для отображения списка сообщений в диалоге.
 */
export class MessageList extends BaseComponent {
    private childMessages: Message[] = [];
    private flexContainer: HTMLElement | null = null;
    private emptyStateElement: HTMLElement | null = null;
    private isLoadingMore = false;
    private messages: Map<string, Message> = new Map();
    private currentHighlightQuery = '';
    private selectedMessageEl: HTMLElement | null = null;

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

    public updateMessage(id: string, text: string): boolean {
        const msg = this.messages.get(id);
        if (!msg) return false;

        msg.updateText(text, true);
        return true;
    }

    /**
     * Обработчик события обновления профиля пользователя через WebSocket.
     * Находит все аватарки этого пользователя в DOM и обновляет их URL.
     * @param {any} payload - Данные обновленного профиля.
     * @private
     */
    private handleUserUpdate = (payload: any): void => {
        if (!this.element || !payload.id) return;

        const avatarUrl = payload.avatar_url || payload.avatarUrl || payload.avatar;
        if (!avatarUrl) return;

        const fullAvatarUrl = getFullUrl(avatarUrl);
        
        // находим все аватарки этого пользователя в DOM списка сообщений
        const avatars = this.element.querySelectorAll(`img[data-user-id="${payload.id}"]`);
        
        avatars.forEach((img: Element) => {
            (img as HTMLImageElement).src = fullAvatarUrl;
        });
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

        wsClient.subscribe('profile.Updated', this.handleUserUpdate);
    }

    /**
     * Рендерит сообщения в список (полная замена текущих сообщений).
     * @param {FrontendMessage[]} messages - Массив сообщений для отображения.
     */
    public setMessages(messages: FrontendMessage[]): void {
        this.childMessages.forEach(msg => msg.unmount());
        this.childMessages = [];
        this.messages.clear();

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
                showAuthor: showAuthor,
                onEdit: (id) => this.props.onRequestEdit?.(id, msgData.text),
            });
            messageComponent.mount(this.flexContainer!);
            this.messages.set(msgData.id, messageComponent);
            if (messageComponent.element) {
                this.flexContainer!.prepend(messageComponent.element);
            }
            if (this.currentHighlightQuery) messageComponent.applyHighlight(this.currentHighlightQuery);
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
                showAuthor,
                onEdit: (id) => this.props.onRequestEdit?.(id, msgData.text),
            });
            const tempDiv = document.createElement('div');
            comp.mount(tempDiv);
            this.messages.set(msgData.id, comp)
            if (this.currentHighlightQuery) comp.applyHighlight(this.currentHighlightQuery);
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
            showAuthor: showAuthor,
            onEdit: (id) => this.props.onRequestEdit?.(id, newMessage.text),
        });
        
        // Новое сообщение всегда в начало DOM (визуальный низ)
        messageComponent.mount(this.flexContainer!);
        if (this.currentHighlightQuery) messageComponent.applyHighlight(this.currentHighlightQuery);
        this.messages.set(newMessage.id, messageComponent);
        if (messageComponent.element) {
            this.flexContainer!.prepend(messageComponent.element);
        }
        this.childMessages.unshift(messageComponent);
        this.scrollToBottom();
    }

    /**
     * Заменяет ID ранее добавленного (оптимистичного) сообщения на ID, присланный сервером.
     * Используется, чтобы при приходе серверного broadcast `message.New` не создавать дубликат DOM.
     * @returns true, если сообщение с `oldId` было найдено и обновлено.
     */
    public getLoadedMessages(): FrontendMessage[] {
        return Array.from(this.messages.values()).map(m => m.props.message);
    }

    public setHighlightQuery(query: string): void {
        this.currentHighlightQuery = query;
        this.childMessages.forEach(m => m.applyHighlight(query));
        if (!query && this.selectedMessageEl) {
            this.selectedMessageEl.classList.remove('message--flash');
            this.selectedMessageEl = null;
        }
    }

    public scrollToMessage(messageId: string): boolean {
        const msg = this.messages.get(messageId);
        if (!msg?.element) return false;

        if (this.selectedMessageEl && this.selectedMessageEl !== msg.element) {
            this.selectedMessageEl.classList.remove('message--flash');
        }
        this.selectedMessageEl = msg.element;
        msg.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        msg.element.classList.add('message--flash');
        return true;
    }

    public replaceMessageId(oldId: string, newId: string, newTimestamp?: Date): boolean {
        const target = this.childMessages.find((m) => m.getId() === oldId);
        if (!target) return false;
        this.messages.delete(oldId);
        target.setId(newId);
        this.messages.set(newId, target);
        if (newTimestamp) target.updateTimestamp(newTimestamp);
        return true;
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
        this.messages.clear();

        wsClient.unsubscribe('profile.Updated', this.handleUserUpdate);
    }
}
