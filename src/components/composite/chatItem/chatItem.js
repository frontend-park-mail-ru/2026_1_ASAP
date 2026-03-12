import { BaseForm } from "../../../core/base/baseForm.js";
import { Avatar } from "../../ui/avatar/avatar.js";
import { ChatInfo } from "../../ui/chatInfo/chatInfo.js";
import { MetaChatInfo } from "../../ui/metaChatInfo/metaChatInfo.js";

export class ChatItem extends BaseForm {
    constructor(props={}) {
        super(props);
        this.tempName = "components/composite/chatItem/chatItem";
    };

    typeToClass() {
        switch (this.props.dialogClass) {
            case 'group':   return 'message-group';
            case 'channel': return 'message-chanel';
            default:        return 'message-personal';
        }
    }

    afterMount() {
        this.avatar = new Avatar({
            class: "chat-avatar",
            src: "../../../assets/images/avatars/chatAvatar.svg",
        });
        this.avatar.mount(this.element);

        this.chatInfo = new ChatInfo({
            class: this.typeToClass(),
            name: this.props.name,
            lastMessage: this.props.lastMessage,
            sender: this.props.sender
        });
        this.chatInfo.mount(this.element);

        this.metaChatInfo = new MetaChatInfo();
        this.metaChatInfo.mount(this.element);

        if (this.props.onClick) {
            this.element.addEventListener('click', this.props.onClick);
        }
    };

    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener('click', this.props.onClick);
        }
    };
}