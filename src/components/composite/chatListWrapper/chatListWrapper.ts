import { BaseForm } from "../../../core/base/baseForm";
import { ChatListItem } from "../chatListItem/chatListItem";
import { Router } from '../../../core/router';
import template from "./chatListWrapper.hbs";

/**
 * @interface ChatListWrapperProps - Свойства компонента обертки списка чатов.
 * @property {Router} router - Экземпляр роутера.
 */
interface ChatListWrapperProps {
    router: Router;
    activeChatId: string | null;
}

/**
 * Обёртка для списка чатов (ChatListItem).
 */
export class ChatListWrapper extends BaseForm<ChatListWrapperProps> {
    private chatList: ChatListItem | null = null;

    /**
     * @param {ChatListWrapperProps} props - Свойства компонента.
     */
    constructor(props: ChatListWrapperProps) {
        super(props);
    }

    getTemplate() {
        return template;
    };

    /**
     * @override
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

    public setActiveChat(chatId: string | null): void {
        if (this.chatList) {
            this.chatList.setActiveChat(chatId);
        }
    }
    /**
     * @override
     */
    beforeUnmount() {
        this.chatList?.unmount();
        this.chatList = null;
    }
}