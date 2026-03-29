import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import { ChatInfo } from "../../ui/chatInfo/chatInfo";
import { MetaChatInfo } from "../../ui/metaChatInfo/metaChatInfo";
import { Chat as ChatType } from '../../../types/chat';
import template from "./chatItem.hbs";

interface ChatItemProps extends IBaseFormProps {
    class?: string;
    chat: ChatType;
    onClick?: (item: ChatItem) => void;
}

export class ChatItem extends BaseForm<ChatItemProps> {
    private avatar: Avatar | null = null;
    private chatInfo: ChatInfo | null = null;
    private metaChatInfo: MetaChatInfo | null = null;

    constructor(props: ChatItemProps) {
        super(props);
        this.props.chat = props.chat;
        this.props.formattedLastMessageTime = props.chat.lastMessage?.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  
    getTemplate() {
        return template;
    }

    private typeToClass(chatType: string): string {
        switch (chatType) {
            case 'group':
                return 'message-group';
            case 'channel':
                return 'message-channel';
            default:
                return 'message-personal';
        }
    }

    protected afterMount() {
        if (!this.element) return;

        const avatarSlot = this.element.querySelector('[data-component="chat-item-avatar-slot"]');
        if (avatarSlot) {
            this.avatar = new Avatar({
                class: "chat-avatar",
                src: this.props.chat.avatarUrl || "../../../assets/images/avatars/chatAvatar.svg",
            });
            this.avatar.mount(avatarSlot as HTMLElement);
        }

        const infoSlot = this.element.querySelector('[data-component="chat-item-info-slot"]');
        if (infoSlot) {
            this.chatInfo = new ChatInfo({
                class: this.typeToClass(this.props.chat.type),
                name: this.props.chat.title,
                lastMessage: this.props.chat.lastMessage?.text,
                sender: this.props.chat.lastMessage?.sender?.login,
            });
            this.chatInfo.mount(infoSlot as HTMLElement);
        }

        const metaSlot = this.element.querySelector('[data-component="chat-item-meta-slot"]');
        if (metaSlot) {
            this.metaChatInfo = new MetaChatInfo({
                lastMessageTime: this.props.formattedLastMessageTime,
                unreadCount: this.props.chat.unreadCount
            });
            this.metaChatInfo.mount(metaSlot as HTMLElement);
        }

        if (this.props.onClick) {
            this.element?.addEventListener('click', this.handleClick);
        }
    }

    private handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick(this);
        }
    }

    protected beforeUnmount() {
        if (this.props.onClick) {
            this.element?.removeEventListener('click', this.handleClick);
        }

        this.avatar?.unmount();
        this.chatInfo?.unmount();
        this.metaChatInfo?.unmount();
    }
}