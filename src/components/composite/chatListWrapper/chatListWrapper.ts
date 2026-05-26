import { BaseForm } from "../../../core/base/baseForm";
import { ChatListItem } from "../chatListItem/chatListItem";
import template from "./chatListWrapper.hbs";
import { SearchChatHit, SearchContactHit } from "../../../types/search";
import { Chat, FrontendMessage } from "../../../types/chat";

/**
 * @interface ChatListWrapperProps
 * @description Свойства для компонента-обертки списка чатов.
 */
interface ChatListWrapperProps {
    chats: Chat[];
    activeChatId: string | null;
    onOpenChat: (chatId: string) => void;
    onOpenContact?: (login: string) => void;
}

/**
 * @class ChatListWrapper
 * @extends BaseForm
 * @description Компонент-обертка, который инкапсулирует и управляет
 * компонентом `ChatListItem`. Основная задача - предоставить контейнер
 * и передать необходимые свойства.
 *
 * @property {ChatListItem | null} chatList - Экземпляр компонента списка чатов.
 */
export class ChatListWrapper extends BaseForm<ChatListWrapperProps> {
    private chatList: ChatListItem | null = null;

    constructor(props: ChatListWrapperProps) {
        super(props);
    }

    getTemplate() {
        return template;
    };

    public updateChatLastMessageText(chatId: string, newText: string): void {
        this.chatList?.updateChatLastMessageText(chatId, newText);
    }

    public setChatLastMessage(chatId: string, lastMessage: FrontendMessage | undefined): void {
        this.chatList?.setChatLastMessage(chatId, lastMessage);
    }

    /**
     * Выполняется после монтирования компонента.
     * Инициализирует и монтирует дочерний компонент `ChatListItem`.
     * @protected
     */
    afterMount() {
        if (!this.element) {
            console.error("ChatListWrapper: компонент не имеет элемента при afterMount.");
            return;
        }

        this.chatList = new ChatListItem({
            chats: this.props.chats,
            activeChatId: this.props.activeChatId,
            onOpenChat: this.props.onOpenChat,
            onOpenContact: this.props.onOpenContact,
        });
        this.chatList.mount(this.element!);
    }

    /**
     * Делегирует установку активного чата дочернему компоненту `ChatListItem`.
     * @param {string | null} chatId - ID чата для установки в качестве активного.
     */
    public setActiveChat(chatId: string | null): void {
        if (this.chatList) {
            this.chatList.setActiveChat(chatId);
        }
    }

    public showSearchResults(hits: SearchChatHit[]): void {
        this.chatList?.showSearchResults(hits);
    };

    public showContactResults(local: SearchContactHit[], global: SearchContactHit[]): void {
        this.chatList?.showContactResults(local, global);
    }

    public restoreChatList(): void {
        this.chatList?.restoreChatList();
    }

    public setChats(chats: Chat[]): void {
        this.props.chats = chats;
        this.chatList?.setChats(chats);
    }

    public addChat(chat: Chat): void {
        this.chatList?.addChat(chat);
    }

    public updateChat(chat: Chat): void {
        this.chatList?.updateChat(chat);
    }

    public removeChat(chatId: string): void {
        this.chatList?.removeChat(chatId);
    }

    public moveChatToTop(chatId: string): void {
        this.chatList?.moveChatToTop(chatId);
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Размонтирует дочерний компонент `ChatListItem` для очистки ресурсов.
     * @protected
     */
    beforeUnmount() {
        this.chatList?.unmount();
        this.chatList = null;
    }
}
