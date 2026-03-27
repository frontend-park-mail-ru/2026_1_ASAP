import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { ChatService } from "../../../services/chatService";
import template from "./chatListItem.hbs";

/**
 * Список чатов. Загружает чаты через ChatService и рендерит ChatItem для каждого.
 */
export class ChatListItem extends BaseForm {
    constructor(props={}) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    /**
     * Выделяет указанный чат, сбрасывая выделение остальных.
     * @param {ChatItem} selectedItem - Выбранный элемент.
     */
    selectChat(selectedItem) {
        this.chatItems.forEach(item => {
            item.element.className = "chat-item--default";
        });

        selectedItem.element.className = "chat-item--selected";
        this.activeItem = selectedItem;
    };

    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        this.chatItems = [];
        this.activeItem = null;

        const service = new ChatService();
        
        service.getChats().then(chats => {
            if (chats.length === 0) {
                this.element.classList.add('chat-list--empty');
                const p = document.createElement('p');
                p.className = "no-chats";
                p.innerHTML = "У вас пока нет чатов,<br> скорее напишите кому нибудь!";
                this.element.appendChild(p);
                return;
            }
            chats.forEach(chat => {
                const item = new ChatItem({
                    class: 'chat-item--default',
                    id: chat.id,
                    name: chat.title,
                    lastMessage: chat.last_message?.text,
                    dialogClass: chat.chat_type,
                    sender: chat.last_message?.sender?.login,
                    onClick: () => this.selectChat(item)
                });
                item.mount(this.element);
                this.chatItems.push(item);
            });
        });
    };

    /**
     * Размонтирует все дочерние компоненты.
     */
    beforeUnmount() {
        this.chatItems.forEach(item => item.unmount());
    }
}