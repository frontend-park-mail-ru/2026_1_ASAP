import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatListItem } from "../chatListItem/chatListItem.js";

/**
 * Обёртка для списка чатов (ChatListItem).
 */
export class ChatListWrapper extends BaseForm {
    constructor(props={}) {
        super(props);
        this.tempName = "components/composite/chatListWrapper/chatListWrapper";
    }

    afterMount() {
        this.chatList = new ChatListItem();
        this.chatList.mount(this.element);
    };
}