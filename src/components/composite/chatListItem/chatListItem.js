import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatItem } from "../chatItem/chatItem.js";
import { ChatService } from "../../../services/chatService.js";

/**
 * Список чатов. Загружает чаты через ChatService и рендерит ChatItem для каждого.
 */
export class ChatListItem extends BaseForm {
    constructor(props={}) {
        super(props);
        this.tempName = "components/composite/chatListItem/chatListItem";
    };
<<<<<<< HEAD
    
=======

    /**
     * Выделяет указанный чат, сбрасывая выделение остальных.
     * @param {ChatItem} selectedItem - Выбранный элемент.
     */
>>>>>>> c4e77b3 (add docs)
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