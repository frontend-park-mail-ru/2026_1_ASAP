import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import { ChatInfo } from "../../ui/chatInfo/chatInfo";
import { MetaChatInfo } from "../../ui/metaChatInfo/metaChatInfo";
import { Chat as ChatType } from '../../../types/chat';
import template from "./chatItem.hbs";

 /**
 * @interface ChatItemProps
 * @description Свойства для компонента элемента чата в списке.
 * @extends IBaseFormProps
 * @property {string} [class] - CSS-класс для кастомизации.
 * @property {ChatType} chat - Объект с данными чата.
 * @property {Function} [onClick] - Колбэк, вызываемый при клике на элемент чата.
 */
interface ChatItemProps extends IBaseFormProps {
    class?: string;
    chat: ChatType;
    onClick?: (item: ChatItem) => void;
}

/**
 * @class ChatItem
 * @extends BaseForm
 * @description Компонент, представляющий один элемент в списке чатов.
 * Отображает аватар, название чата, последнее сообщение и мета-информацию.
 *
 * @property {Avatar | null} avatar - Компонент аватара чата.
 * @property {ChatInfo | null} chatInfo - Компонент с основной информацией о чате.
 * @property {MetaChatInfo | null} metaChatInfo - Компонент с мета-информацией (время, непрочитанные сообщения).
 */
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

    /**
     * Преобразует тип чата в соответствующий CSS-класс для стилизации.
     * @param {string} chatType - Тип чата ('group', 'channel', 'personal').
     * @returns {string} CSS-класс.
     * @private
     */
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

    /**
     * Выполняется после монтирования компонента.
     * Инициализирует и монтирует дочерние компоненты (аватар, информация о чате, мета-данные)
     * и добавляет обработчик клика.
     * @protected
     */
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

    /**
     * Обработчик клика по элементу чата.
     * Вызывает колбэк `onClick`, переданный в свойствах.
     * @private
     */
    private handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick(this);
        }
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Удаляет обработчик клика и размонтирует дочерние компоненты для предотвращения утечек памяти.
     * @protected
     */
    protected beforeUnmount() {
        if (this.props.onClick) {
            this.element?.removeEventListener('click', this.handleClick);
        }

        this.avatar?.unmount();
        this.chatInfo?.unmount();
        this.metaChatInfo?.unmount();
    }
}