import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatItem } from "../chatItem/chatItem.js";
import { ChatService } from "../../../services/chatService.js";

export class ChatListItem extends BaseForm {
    render() {
        const ChatListItem = document.createElement('div');
        ChatListItem.className = "chat-list";
        return ChatListItem;
    };

    selectChat(selectedItem) {
        this.chatItems.forEach(item => {
            item.element.className = "chat-item--default";
        });

        selectedItem.element.className = "chat-item--selected";
        this.activeItem = selectedItem;
    };

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

    beforeUnmount() {
        this.chatItems.forEach(item => item.unmount());
    }
}