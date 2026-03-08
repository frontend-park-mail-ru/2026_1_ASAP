import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatItem } from "../chatItem/chatItem.js";

export class ChatListItem extends BaseForm {
    render() {
        const ChatListItem = document.createElement('div');
        ChatListItem.className = "chat-list";
        return ChatListItem;
    };

    afterMount() {
        this.chatItem1 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem1.mount(this.element);

        this.chatItem2 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem2.mount(this.element);

        this.chatItem3 = new ChatItem({
            class: "chat-item--selected",
        });
        this.chatItem3.mount(this.element);

        this.chatItem4 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem4.mount(this.element);

        this.chatItem5 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem5.mount(this.element);

        this.chatItem6 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem6.mount(this.element);

        this.chatItem7 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem7.mount(this.element);

        this.chatItem8 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem8.mount(this.element);

        this.chatItem9 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem9.mount(this.element);

        this.chatItem10 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem10.mount(this.element);

        this.chatItem11 = new ChatItem({
            class: "chat-item--default",
        });
        this.chatItem11.mount(this.element);
    };
}