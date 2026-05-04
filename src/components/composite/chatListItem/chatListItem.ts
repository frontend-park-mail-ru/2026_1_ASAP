import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { ChatListEmpty } from "../chatListEmpty/chatListEmpty";
import { chatService } from "../../../services/chatService";
import { Router } from '../../../core/router';
import { 
    wsClient, 
    MessageDto, 
    ChatInformationDto,
    ChatUpdatedAvatarDto,
    ChatUpdatedTitleDto,
    ChatUpdatedDescriptionDto,
    ChatUpdatedMembersDto,
    ChatDeletedDto,
} from '../../../core/utils/wsClient';
import { contactService } from "../../../services/contactService";
import template from "./chatListItem.hbs";
import { Chat, FrontendMessage, User } from "../../../types/chat";
import { SearchChatHit } from "../../../types/search";




/**
 * @interface ChatListItemProps
 * @description Свойства для компонента, отображающего список чатов.
 * @property {Router} router - Экземпляр роутера для навигации.
 * @property {string | null} activeChatId - ID активного (выбранного) чата.
 */
interface ChatListItemProps {
    router: Router;
    activeChatId: string | null;
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

    /**
     * Стрелочная функция-обработчик WS-события «message.New».
     * Хранится как поле класса, чтобы иметь возможность отписаться в beforeUnmount.
     */
    private myId: number | null = null;

    /**
     * Обработчик события «chat.New»: добавление нового чата в начало списка.
     */
    private readonly handleChatNew = (payload: ChatInformationDto): void => {
        if (!this.myId || this.chatItems.some(item => String(item.props.chat.id) === String(payload.id))) {
            return;
        }

        const chat = chatService.mapChatDtoToChat(payload, this.myId);
        const item = new ChatItem({
            class: 'chat-item--default',
            chat: chat,
            onClick: (clickedItem: ChatItem) => this.handleChatClick(clickedItem)
        });

        if (this.element) {
            this.emptyComponent?.unmount();
            this.emptyComponent = null;
            this.element.classList.remove('chat-list--empty');
            
            item.mount(this.element);
            this.element.prepend(item.element!);
            this.chatItems.unshift(item);
        }
    };


    /**
     * Обработчик события «chat.Deleted»: удаление чата из списка.
     * Если удален текущий открытый чат, выполняется переход на страницу «Выберите чат».
     */
    private readonly handleChatDeleted = (payload: ChatDeletedDto): void => {
        const targetId = String(payload.id);
        const index = this.chatItems.findIndex(item => String(item.props.chat.id) === targetId);
        if (index === -1) return;

        const [item] = this.chatItems.splice(index, 1);
        item.unmount();

        if (this.chatItems.length === 0 && this.element) {
            this.element.classList.add('chat-list--empty');
            this.emptyComponent = new ChatListEmpty({});
            this.emptyComponent.mount(this.element);
        }

        if (this.activeChatId === targetId) {
            this.props.router.navigate('/chats');
        }
    };

    /**
     * Обработчик события «message.New»: обновление текста последнего сообщения и подъем чата.
     */
    private readonly handleMessageNew = (payload: MessageDto): void => {
        if (!this.myId) return;

        const targetId = String(payload.chat_id);
        const targetItem = this.chatItems.find(item => String(item.props.chat.id) === targetId);
        
        if (targetItem) {
            const updatedChat = { ...targetItem.props.chat };
            updatedChat.lastMessage = chatService.convertWsMessageDto(payload, this.myId);

            targetItem.update(updatedChat);
            this.moveChatToTop(targetId);
        }
    };

    private readonly handleChatAvatarUpdated = (payload: ChatUpdatedAvatarDto): void => {
        const target = this.chatItems.find(item => String(item.props.chat.id) === String(payload.chat_id));
        if (!target) return;

        const updatedChat = { ...target.props.chat, avatarUrl: payload.avatar_url };
        target.update(updatedChat);
    };

    private readonly handleChatTitleUpdated = (payload: ChatUpdatedTitleDto): void => {
        const target = this.chatItems.find(item => String(item.props.chat.id) === String(payload.chat_id));
        if (!target) return;

        const updatedChat = { ...target.props.chat, title: payload.title };
        target.update(updatedChat);
    };

    private readonly handleChatDescriptionUpdated = (payload: ChatUpdatedDescriptionDto): void => {
        const target = this.chatItems.find(item => String(item.props.chat.id) === String(payload.chat_id));
        if (!target) return;

        const updatedChat = { ...target.props.chat, description: payload.description } as Chat;
        target.update(updatedChat);
    };

    private readonly handleChatMembersUpdated = (payload: ChatUpdatedMembersDto): void => {
        if (!this.myId) return;

        if (payload.type === 'deleted' && payload.updated_members_id.includes(this.myId)) {
            const targetId = String(payload.chat_id);
            const index = this.chatItems.findIndex(item => String(item.props.chat.id) === targetId);
            if (index === -1) return;

            const [item] = this.chatItems.splice(index, 1);
            item.unmount();

            if (this.chatItems.length === 0 && this.element) {
                this.element.classList.add('chat-list--empty');
                this.emptyComponent = new ChatListEmpty({});
                this.emptyComponent.mount(this.element);
            }

            if (this.activeChatId === targetId) {
                this.props.router.navigate('/chats');
            }
        }
    };

    constructor(props: ChatListItemProps) {
        super(props);
        this.activeChatId = props.activeChatId;
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
        this.props.router.navigate(`/chats/${chatId}`);
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
        const target = this.chatItems.find(item => String(item.props.chat.id) === chatId);
        if (!target) return;
        if (!target.props.chat.lastMessage) return;

        const updatedChat = { ...target.props.chat };
        updatedChat.lastMessage = { ...updatedChat.lastMessage!, text: newText };
        target.update(updatedChat);
    }

    public setChatLastMessage(chatId: string, lastMessage: FrontendMessage | undefined): void {
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
     * Загружает список чатов с помощью `chatService`, создает и монтирует
     * для каждого чата компонент `ChatItem`. Если чатов нет, отображает соответствующее сообщение.
     * Также подписывается на WS-событие «message.New» для обновления превью.
     * @protected
     */
    protected afterMount() {
        this.chatItems = [];

        contactService.getMyId().then(myId => {
            this.myId = myId;
            return chatService.getChats(myId);
        }).then(chats => {
            if (!this.element) {
                console.error("ChatListItem: компонент не имеет элемента при afterMount.");
                return;
            }

            chats.sort((a, b) => {
                const timeA = a.lastMessage?.timestamp ? a.lastMessage.timestamp.getTime() : 0;
                const timeB = b.lastMessage?.timestamp ? b.lastMessage.timestamp.getTime() : 0;
                return timeB - timeA;
            });

            this.originalChats = chats;
            this.renderChats(chats);
        });

        wsClient.subscribe<ChatInformationDto>('chat.New', this.handleChatNew);
        wsClient.subscribe<ChatDeletedDto>('chat.Deleted', this.handleChatDeleted);
        wsClient.subscribe<ChatUpdatedAvatarDto>('chat.Updated.Avatar', this.handleChatAvatarUpdated);
        wsClient.subscribe<ChatUpdatedTitleDto>('chat.Updated.Title', this.handleChatTitleUpdated);
        wsClient.subscribe<ChatUpdatedDescriptionDto>('chat.Updated.Description', this.handleChatDescriptionUpdated);
        wsClient.subscribe<ChatUpdatedMembersDto>('chat.Updated.Members', this.handleChatMembersUpdated);
        wsClient.subscribe<MessageDto>('message.New', this.handleMessageNew);
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает список, размонтируя все `ChatItem`, удаляет сообщение об отсутствии чатов
     * и **отписывается** от WS-событий для предотвращения утечек памяти.
     */
    beforeUnmount() {
        wsClient.unsubscribe('chat.New', this.handleChatNew);
        wsClient.unsubscribe('chat.Deleted', this.handleChatDeleted);
        wsClient.unsubscribe('chat.Updated.Avatar', this.handleChatAvatarUpdated);
        wsClient.unsubscribe('chat.Updated.Title', this.handleChatTitleUpdated);
        wsClient.unsubscribe('chat.Updated.Description', this.handleChatDescriptionUpdated);
        wsClient.unsubscribe('chat.Updated.Members', this.handleChatMembersUpdated);
        wsClient.unsubscribe('message.New', this.handleMessageNew);

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

        const index = this.chatItems.findIndex(item => String(item.props.chat.id) === String(chatId));
        if (index <= 0) return; // уже наверху или не найден

        const [targetItem] = this.chatItems.splice(index, 1);
        this.chatItems.unshift(targetItem);

        if (targetItem.element) {
            this.element.prepend(targetItem.element);
        }
    }
}