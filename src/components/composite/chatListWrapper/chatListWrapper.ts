import { BaseForm } from "../../../core/base/baseForm.js";
import { ChatListItem } from "../chatListItem/chatListItem.js";
import { Router } from '../../../core/router.js';

/**
 * @interface ChatListWrapperProps - Свойства компонента обертки списка чатов.
 * @property {Router} router - Экземпляр роутера.
 */
interface ChatListWrapperProps {
    router: Router;
}

/**
 * Обёртка для списка чатов (ChatListItem).
 */
export class ChatListWrapper extends BaseForm {
    private chatList: ChatListItem | null = null;

    /**
     * @param {ChatListWrapperProps} props - Свойства компонента.
     */
    constructor(props: ChatListWrapperProps) {
        super(props);
        this.tempName = "components/composite/chatListWrapper/chatListWrapper";
    }

    /**
     * @override
     */
    afterMount() {
        if (!this.element) {
            console.error("ChatListWrapper: компонент не имеет элемента при afterMount.");
            return;
        }

        this.chatList = new ChatListItem({ router: this.props.router });
        this.chatList.mount(this.element!);
    }

    /**
     * @override
     */
    beforeUnmount() {
        this.chatList?.unmount();
        this.chatList = null;
    }
}