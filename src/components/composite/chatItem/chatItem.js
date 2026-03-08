import { BaseForm } from "../../../core/base/baseForm.js";
import { Avatar } from "../../ui/avatar/avatar.js";
import { ChatInfo } from "../../ui/chatInfo/chatInfo.js";
import { MetaChatInfo } from "../../ui/metaChatInfo/metaChatInfo.js";

export class ChatItem extends BaseForm {
    constructor(props={}) {
        super(props);

        this.class = props.class;
    }
    render() {
        const chatItem = document.createElement('div');
        chatItem.className = this.class;

        return chatItem;
    };

    afterMount() {
        this.avatar = new Avatar({
            class: "chat-avatar",
            src: "../../../assets/images/avatars/chatAvatar.svg",
        });
        this.avatar.mount(this.element);

        this.chatInfo = new ChatInfo({
            class: "message-personal",
        });
        this.chatInfo.mount(this.element);

        this.metaChatInfo = new MetaChatInfo();
        this.metaChatInfo.mount(this.element);
    };
}