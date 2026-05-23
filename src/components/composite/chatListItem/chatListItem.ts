import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { ChatListEmpty } from "../chatListEmpty/chatListEmpty";
import template from "./chatListItem.hbs";
import { Chat, FrontendMessage, User } from "../../../types/chat";
import { SearchChatHit } from "../../../types/search";




/**
 * @interface ChatListItemProps
 * @description Свойства для компонента, отображающего список чатов.
 * @property {Chat[]} chats - Данные чатов для отображения.
 * @property {string | null} activeChatId - ID активного (выбранного) чата.
 * @property {Function} onOpenChat - Колбэк открытия чата.
 */
interface ChatListItemProps {
    chats: Chat[];
    activeChatId: string | null;
    onOpenChat: (chatId: string) => void;
}

/**
 * @class ChatListItem
 * @extends BaseForm
 * @description Компонент, который отображает список чатов пользователя.
 * Он загружает данные о чатах, управляет их отображением и выбором активного чата.
 *
 * @property {ChatItem[]} chatItems - Массив экземпляров компонентов `ChatItem`.
 * @property {string | null} activeChatId - ID текущего активного чата.
 * @property {HTMLElement | null} noChatsElement - Элемент, отображаемый при отсутствии чатов.
 */
export class ChatListItem extends BaseForm<ChatListItemProps> {
    private chatItems: ChatItem[] = [];
    private activeChatId: string | null = null;
    private emptyComponent: ChatListEmpty | null = null;
    private originalChats: Chat[] = [];
    private isSearchAlive: boolean = false;

    constructor(props: ChatListItemProps) {
        super(props);
        this.activeChatId = props.activeChatId;
        this.originalChats = this.sortChats(props.chats);
    }

    getTemplate() {
        return template;
    }

    /**
     * Обработчик клика по элементу чата. Выполняет навигацию на страницу выбранного чата.
     * @param {ChatItem} clickedItem - Экземпляр `ChatItem`, по которому был выполнен клик.
     * @private
     */
    private handleChatClick = (clickedItem: ChatItem) => {
        const chatId = clickedItem.props.chat.id as string;
        this.props.onOpenChat(chatId);
    }

    /**
     * Устанавливает активный чат в списке, подсвечивая его.
     * @param {string | null} chatId - ID чата, который нужно сделать активным.
     */
    public setActiveChat(chatId: string | null): void {
        this.activeChatId = chatId;
        this.chatItems.forEach(item => {
            if (item.element) {
                if ((item.props.chat.id as string) === chatId) {
                    item.element.classList.remove("chat-item--default");
                    item.element.classList.add("chat-item--selected");
                } else {
                    item.element.classList.remove("chat-item--selected");
                    item.element.classList.add("chat-item--default");
                }
            }
        });
    }

    private renderChats(chats: Chat[]): void {
        if (!this.element) return;

        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.emptyComponent?.unmount();
        this.emptyComponent = null;

        if (chats.length === 0) {
            this.element.classList.add('chat-list--empty');
            this.emptyComponent = new ChatListEmpty({
                text: this.isSearchAlive ? "Ничего не найдено" : undefined,
                iconAfter: this.isSearchAlive ? "/assets/images/icons/noResultsSearch.svg" : undefined,
            });
            this.emptyComponent.mount(this.element);
            return;
        }

        this.element.classList.remove('chat-list--empty');

        chats.forEach(chat => {
            const item = new ChatItem({
                class: (chat.id === this.activeChatId) ? 'chat-item--selected' : 'chat-item--default',
                chat: chat,
                onClick: (clickedItem: ChatItem) => this.handleChatClick(clickedItem),
            });
            item.mount(this.element!);
            this.chatItems.push(item);
        });
    }

    private sortChats(chats: Chat[]): Chat[] {
        return [...chats].sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? a.lastMessage.timestamp.getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? b.lastMessage.timestamp.getTime() : 0;
            return timeB - timeA;
        });
    }

    public setChats(chats: Chat[]): void {
        this.originalChats = this.sortChats(chats);
        if (!this.isSearchAlive) {
            this.renderChats(this.originalChats);
        }
    }

    public addChat(chat: Chat): void {
        if (this.originalChats.some(item => String(item.id) === String(chat.id))) return;

        this.originalChats = [chat, ...this.originalChats];
        if (!this.isSearchAlive) {
            this.renderChats(this.originalChats);
        }
    }

    public updateChat(chat: Chat): void {
        this.originalChats = this.originalChats.map(item =>
            String(item.id) === String(chat.id) ? chat : item
        );

        const renderedItem = this.chatItems.find(item => String(item.props.chat.id) === String(chat.id));
        renderedItem?.update(chat);
    }

    public removeChat(chatId: string): void {
        this.originalChats = this.originalChats.filter(chat => String(chat.id) !== String(chatId));

        const index = this.chatItems.findIndex(item => String(item.props.chat.id) === String(chatId));
        if (index === -1) return;

        const [item] = this.chatItems.splice(index, 1);
        item.unmount();
        this.renderEmptyIfNeeded();
    }

    private hitToChat(hit: SearchChatHit): Chat {
        const lastMessage = hit.lastMessagePreview ? {
            id: '',
            text: hit.lastMessagePreview,
            timestamp: hit.lastMessageAt ?? new Date(),
            sender: { id: 0 } as User,
            isOwn: false,
        } : undefined;

        return {
            id: hit.chatId,
            title: hit.title,
            type: hit.type,
            avatarUrl: hit.avatarUrl,
            unreadCount: hit.unreadCount,
            lastMessage
        } as unknown as Chat;
    }

    public updateChatLastMessageText(chatId: string, newText: string): void {
        let updatedChat: Chat | undefined;

        this.originalChats = this.originalChats.map(chat => {
            if (String(chat.id) !== chatId || !chat.lastMessage) return chat;
            updatedChat = {
                ...chat,
                lastMessage: {
                    ...chat.lastMessage,
                    text: newText,
                },
            } as Chat;
            return updatedChat;
        });

        if (!updatedChat) return;

        const target = this.chatItems.find(item => String(item.props.chat.id) === chatId);
        target?.update(updatedChat);
    }

    public setChatLastMessage(chatId: string, lastMessage: FrontendMessage | undefined): void {
        this.originalChats = this.originalChats.map(chat => {
            if (String(chat.id) !== String(chatId)) return chat;
            return { ...chat, lastMessage } as Chat;
        });

        const target = this.chatItems.find(item => String(item.props.chat.id) === chatId);
        if (!target) return;

        const updatedChat = { ...target.props.chat };
        updatedChat.lastMessage = lastMessage;
        target.update(updatedChat);
    }

    public showSearchResults(hits: SearchChatHit[]): void {
        this.isSearchAlive = true;
        const chats = hits.map(hit => this.hitToChat(hit));
        this.renderChats(chats);
    };

    public restoreChatList(): void {
        this.isSearchAlive = false;
        this.renderChats(this.originalChats);
    };

    /**
     * Выполняется после монтирования компонента.
     * Создает и монтирует для каждого чата компонент `ChatItem`.
     * Если чатов нет, отображает соответствующее сообщение.
     * @protected
     */
    protected afterMount() {
        this.chatItems = [];
        this.renderChats(this.originalChats);
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает список, размонтируя все `ChatItem`, удаляет сообщение об отсутствии чатов
     * и **отписывается** от WS-событий для предотвращения утечек памяти.
     */
    beforeUnmount() {
        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.activeChatId = null;
        this.emptyComponent?.unmount();
        this.emptyComponent = null;
    }

    /**
     * Перемещает элемент чата в начало DOM-списка (визуально «поднимает» чат наверх).
     * Также переставляет соответствующий `ChatItem` в начало массива `chatItems`.
     * @param {string} chatId - ID чата для перемещения.
     */
    public moveChatToTop(chatId: string): void {
        if (!this.element) return;

        const originalIndex = this.originalChats.findIndex(chat => String(chat.id) === String(chatId));
        if (originalIndex > 0) {
            const [chat] = this.originalChats.splice(originalIndex, 1);
            this.originalChats.unshift(chat);
        }

        const index = this.chatItems.findIndex(item => String(item.props.chat.id) === String(chatId));
        if (index <= 0) return; // уже наверху или не найден

        const [targetItem] = this.chatItems.splice(index, 1);
        this.chatItems.unshift(targetItem);

        if (targetItem.element) {
            this.element.prepend(targetItem.element);
        }
    }

    private renderEmptyIfNeeded(): void {
        if (this.chatItems.length > 0 || !this.element) return;

        this.emptyComponent?.unmount();
        this.emptyComponent = new ChatListEmpty({
            text: this.isSearchAlive ? "Ничего не найдено" : undefined,
            iconAfter: this.isSearchAlive ? "/assets/images/icons/noResultsSearch.svg" : undefined,
        });
        this.element.classList.add('chat-list--empty');
        this.emptyComponent.mount(this.element);
    }
}
