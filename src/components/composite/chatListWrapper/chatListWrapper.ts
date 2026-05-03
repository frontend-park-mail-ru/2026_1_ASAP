import { BaseForm } from "../../../core/base/baseForm";
import { ChatListItem } from "../chatListItem/chatListItem";
import { Router } from '../../../core/router';
import template from "./chatListWrapper.hbs";
import { SearchChatHit } from "../../../types/search";
import { FrontendMessage } from "../../../types/chat";

/**
 * @interface ChatListWrapperProps
 * @description Свойства для компонента-обертки списка чатов.
 * @property {Router} router - Экземпляр роутера для передачи дочерним компонентам.
 * @property {string | null} activeChatId - ID активного чата для начальной установки.
 */
interface ChatListWrapperProps {
    router: Router;
    activeChatId: string | null;
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
            router: this.props.router,
            activeChatId: this.props.activeChatId
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

    public restoreChatList(): void {
        this.chatList?.restoreChatList();
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