import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { chatService } from "../../../services/chatService";
import { Router } from '../../../core/router';
import template from "./chatListItem.hbs";

const CURRENT_USER_LOGIN = 'bob'; // Заглушка для теста, потом убрать


/**
 * @interface ChatListItemProps - Свойства компонента списка чатов.
 * @property {Router} router - Экземпляр роутера.
 */
interface ChatListItemProps {
    router: Router;
    activeChatId: string | null;
}

/**
 * Список чатов. Загружает чаты через ChatService и рендерит ChatItem для каждого.
 */
export class ChatListItem extends BaseForm<ChatListItemProps> {
    private chatItems: ChatItem[] = [];
    private activeChatId: string | null = null;
    private noChatsElement: HTMLElement | null = null;

    constructor(props: ChatListItemProps) {
        super(props);
        this.tempName = "components/composite/chatListItem/chatListItem";
        this.activeChatId = props.activeChatId;
    }

    getTemplate() {
        return template;
    }

    private handleChatClick = (clickedItem: ChatItem) => {
        const chatId = clickedItem.props.chat.id as string;
        this.props.router.navigate(`/chats/${chatId}`);
    }

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

    protected afterMount() {
        this.chatItems = [];

        chatService.getChats(CURRENT_USER_LOGIN).then(chats => {
            if (!this.element) {
                console.error("ChatListItem: компонент не имеет элемента при afterMount.");
                return;
            }

            if (chats.length === 0) {
                this.element.classList.add('chat-list--empty');
                this.noChatsElement = document.createElement('p');
                this.noChatsElement.className = "no-chats";
                this.noChatsElement.innerHTML = "У вас пока нет чатов,<br> скорее напишите кому нибудь!";
                this.element.appendChild(this.noChatsElement);
                return;
            }

            chats.forEach(chat => {
                const item = new ChatItem({
                    class: (chat.id === this.activeChatId) ? 'chat-item--selected' : 'chat-item--default',
                    chat: chat,
                    onClick: (clickedItem: ChatItem) => this.handleChatClick(clickedItem)
                });

                item.mount(this.element!);
                this.chatItems.push(item);
            });
        });
    }

    beforeUnmount() {
        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.activeChatId = null;
        this.noChatsElement?.remove();
    }
}