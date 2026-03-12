import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatListItem } from "../chatListItem/chatListItem.js";

/**
 * Обёртка для списка чатов (ChatListItem).
 */
export class ChatListWrapper extends BaseForm {
<<<<<<< HEAD
    constructor(props={}) {
        super(props);
        this.tempName = "components/composite/chatListWrapper/chatListWrapper";
    }

=======
    render() {
        const chatWrapper = document.createElement('div');
        chatWrapper.className = "chat-list-wrapper";
        return chatWrapper;
    };
    
    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
>>>>>>> c4e77b3 (add docs)
    afterMount() {
        this.chatList = new ChatListItem();
        this.chatList.mount(this.element);
    };
}