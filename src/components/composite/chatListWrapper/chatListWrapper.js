import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatListItem } from "../chatListItem/chatListItem.js";
import template from "./chatListWrapper.hbs";

/**
 * Обёртка для списка чатов (ChatListItem).
 */
export class ChatListWrapper extends BaseForm {
    constructor(props={}) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    afterMount() {
        this.chatList = new ChatListItem();
        this.chatList.mount(this.element);
    };
}