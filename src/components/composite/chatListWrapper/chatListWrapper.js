import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatListItem } from "../chatListItem/chatListItem.js";

export class ChatListWrapper extends BaseForm {
    render() {
        const chatWrapper = document.createElement('div');
        chatWrapper.className = "chat-list-wrapper";
        return chatWrapper;
    };

    afterMount() {
        this.chatList = new ChatListItem();
        this.chatList.mount(this.element);
    };
}