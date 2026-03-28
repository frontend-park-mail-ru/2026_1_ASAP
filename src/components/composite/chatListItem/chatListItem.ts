import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatItem } from "../chatItem/chatItem.js";
import { chatService } from "../../../services/chatService.js";
import { Chat as ChatType } from '../../../types/chat.js';
import { Router } from '../../../core/router.js';
import template from "./chatListItem.hbs";

const CURRENT_USER_LOGIN = 'bob'; // Заглушка для теста, потом убрать


/**
 * @interface ChatListItemProps - Свойства компонента списка чатов.
 * @property {Router} router - Экземпляр роутера.
 */
interface ChatListItemProps {
    router: Router;
}

/**
 * Список чатов. Загружает чаты через ChatService и рендерит ChatItem для каждого.
 */
export class ChatListItem extends BaseForm {
    private chatItems: ChatItem[] = [];
    private activeItem: ChatItem | null = null;
    private noChatsElement: HTMLElement | null = null;

    /**
     * @param {ChatListItemProps} props - Свойства компонента.
     */
    constructor(props: ChatListItemProps) {
        super(props);
    }
      
    getTemplate() {
        return template;
    };

    /**
     * Выделяет указанный чат, сбрасывая выделение остальных.
     * Также обновляет URL через роутер.
     * @param {ChatItem} selectedItem - Выбранный элемент.
     */
    private selectChat = (selectedItem: ChatItem) => {
        if (this.activeItem?.element) {
            this.activeItem.element.classList.remove("chat-item--selected");
            this.activeItem.element.classList.add("chat-item--default");
        }

        if (selectedItem.element) {
            selectedItem.element.classList.remove("chat-item--default");
            selectedItem.element.classList.add("chat-item--selected");
        }

        this.activeItem = selectedItem;
        this.props.router.navigate(`/chats/${selectedItem.props.chat.id}`);
    }

    /**
     * @override
     */
    protected afterMount() {
        this.chatItems = [];
        this.activeItem = null;

        chatService.getChats(CURRENT_USER_LOGIN).then(chats => { // Заменить на реальный логин пользователя
            if (!this.element) {
                console.error("ChatListItem: компонент не имеет элемента при afterMount.");
                return;
            };

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
                    class: 'chat-item--default',
                    chat: chat,
                    onClick: ( chatId: string) => this.selectChat(item)
                });
                
                item.mount(this.element!); 
                this.chatItems.push(item);
            });
        });
    }

    /**
     * @override
     */
    beforeUnmount() {
        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.activeItem = null;
        this.noChatsElement?.remove();
    }
}