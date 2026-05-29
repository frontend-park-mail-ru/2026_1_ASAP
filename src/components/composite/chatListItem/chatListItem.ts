import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { ChatListEmpty } from "../chatListEmpty/chatListEmpty";
import template from "./chatListItem.hbs";
import { Chat, DialogChat, FrontendMessage, User } from "../../../types/chat";
import { SearchChatHit, SearchContactHit } from "../../../types/search";


const CONTACT_HIT_ID_PREFIX = 'contact:';
const DEFAULT_AVATAR_URL = '/assets/images/avatars/defaultAvatar.svg';

function isDefaultAvatarUrl(url?: string): boolean {
    return !url || url.includes('defaultAvatar.svg');
}

/**
 * @interface ChatListItemProps
 * @description Свойства для компонента, отображающего список чатов.
 * @property {Chat[]} chats - Данные чатов для отображения.
 * @property {string | null} activeChatId - ID активного (выбранного) чата.
 * @property {Function} onOpenChat - Колбэк открытия чата.
 * @property {Function} [onOpenContact] - Колбэк открытия профиля контакта (по логину).
 */
interface ChatListItemProps {
    chats: Chat[];
    activeChatId: string | null;
    onOpenChat: (chatId: string) => void;
    onOpenContact?: (login: string) => void;
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
    private skeletonEls: HTMLElement[] = [];

    constructor(props: ChatListItemProps) {
        super(props);
        this.activeChatId = props.activeChatId;
        this.originalChats = this.sortChats(props.chats);
    }

    getTemplate() {
        return template;
    }

    /** Рисует N skeleton-строк чата (avatar + 2 текстовые строки + meta). */
    private showSkeletons(count: number): void {
        if (!this.element) return;
        this.clearSkeletons();
        for (let i = 0; i < count; i += 1) {
            const row = document.createElement('div');
            row.className = 'chat-list__skeleton';
            row.innerHTML = `
                <div class="chat-list__skeleton-avatar"></div>
                <div class="chat-list__skeleton-content">
                    <div class="chat-list__skeleton-line chat-list__skeleton-line--title"></div>
                    <div class="chat-list__skeleton-line chat-list__skeleton-line--subtitle"></div>
                </div>
                <div class="chat-list__skeleton-meta"></div>
            `;
            this.element.appendChild(row);
            this.skeletonEls.push(row);
        }
    }

    private clearSkeletons(): void {
        this.skeletonEls.forEach((el) => el.remove());
        this.skeletonEls = [];
    }

    /**
     * Обработчик клика по элементу чата. Выполняет навигацию на страницу выбранного чата.
     * @param {ChatItem} clickedItem - Экземпляр `ChatItem`, по которому был выполнен клик.
     * @private
     */
    private handleChatClick = (clickedItem: ChatItem) => {
        const chatId = clickedItem.props.chat.id as string;
        if (chatId.startsWith(CONTACT_HIT_ID_PREFIX)) {
            const login = chatId.slice(CONTACT_HIT_ID_PREFIX.length);
            this.props.onOpenContact?.(login);
            return;
        }
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

        this.clearSkeletons();
        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.emptyComponent?.unmount();
        this.emptyComponent = null;
        // Чистим баннер «Глобальный поиск» (мог остаться от предыдущего рендера
        // контакт-результатов на другом табе).
        this.element.querySelectorAll('.chat-list__system-row').forEach((el) => el.remove());

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
        const originalChat = this.originalChats.find(chat => String(chat.id) === String(hit.chatId));
        const avatarUrl = isDefaultAvatarUrl(hit.avatarUrl)
            ? originalChat?.avatarUrl || hit.avatarUrl || DEFAULT_AVATAR_URL
            : hit.avatarUrl;
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
            avatarUrl,
            unreadCount: hit.unreadCount,
            lastMessage
        } as unknown as Chat;
    }

    /**
     * Конвертирует SearchContactHit в фейковый DialogChat, чтобы переиспользовать
     * ChatItem для рендера в sidebar. id вида `contact:<login>` ловится в
     * handleChatClick и диспатчится в onOpenContact.
     */
    private contactHitToChat(hit: SearchContactHit): DialogChat {
        const login = hit.login ?? `user_${hit.userId}`;
        const title = hit.displayName || login;
        return {
            id: `${CONTACT_HIT_ID_PREFIX}${login}`,
            title,
            type: 'dialog',
            avatarUrl: hit.avatarUrl,
            unreadCount: 0,
            interlocutor: {
                id: hit.userId,
                login,
                avatarUrl: hit.avatarUrl,
            },
        } as DialogChat;
    }

    /**
     * Показывает в sidebar результаты поиска контактов: сначала локальные
     * (мои), затем баннер «Глобальный поиск», затем все остальные. Клик
     * по элементу диспатчится в onOpenContact (открыть профиль).
     */
    public showContactResults(local: SearchContactHit[], global: SearchContactHit[]): void {
        if (!this.element) return;

        this.clearSkeletons();
        this.isSearchAlive = true;
        this.chatItems.forEach((item) => item.unmount());
        this.chatItems = [];
        this.emptyComponent?.unmount();
        this.emptyComponent = null;
        // Чистим прошлые системные строки (banner) от предыдущего рендера.
        this.element.querySelectorAll('.chat-list__system-row').forEach((el) => el.remove());

        if (local.length === 0 && global.length === 0) {
            this.element.classList.add('chat-list--empty');
            this.emptyComponent = new ChatListEmpty({
                text: 'Ничего не найдено',
                iconAfter: '/assets/images/icons/noResultsSearch.svg',
            });
            this.emptyComponent.mount(this.element);
            return;
        }

        this.element.classList.remove('chat-list--empty');

        // Локальные контакты.
        local.forEach((hit) => this.mountContactItem(hit));

        // Banner «Глобальный поиск» — между local и global.
        if (global.length > 0) {
            const banner = document.createElement('div');
            banner.className = 'chat-list__system-row';
            banner.textContent = 'Глобальный поиск';
            this.element.appendChild(banner);

            global.forEach((hit) => this.mountContactItem(hit));
        }
    }

    private mountContactItem(hit: SearchContactHit): void {
        if (!this.element) return;
        const fakeChat = this.contactHitToChat(hit);
        const item = new ChatItem({
            class: 'chat-item--default',
            chat: fakeChat,
            onClick: (clickedItem: ChatItem) => this.handleChatClick(clickedItem),
        });
        item.mount(this.element);
        this.chatItems.push(item);
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
        this.clearSkeletons();
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
        // Если чатов на момент маунта ещё нет (бэк не ответил) — показываем
        // skeleton-строки. setChats придёт позже и через renderChats их снимет.
        if (this.originalChats.length === 0) {
            this.showSkeletons(6);
            return;
        }
        this.renderChats(this.originalChats);
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает список, размонтируя все `ChatItem`, удаляет сообщение об отсутствии чатов
     * и **отписывается** от WS-событий для предотвращения утечек памяти.
     */
    beforeUnmount() {
        this.clearSkeletons();
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
