import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import { ChatInfo } from "../../ui/chatInfo/chatInfo";
import { MetaChatInfo, formatUnreadBadge } from "../../ui/metaChatInfo/metaChatInfo";
import { Chat as ChatType, FrontendMessage } from '../../../types/chat';
import template from "./chatItem.hbs";
import { getLastMessagePreview } from "../../../utils/lastMessagePreview";

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
    formattedLastMessageTime?: string;
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
        this.props.formattedLastMessageTime = props.chat.lastMessage ? this.formatTime(props.chat.lastMessage.timestamp) : '';
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
                return 'message-chanel';
            default:
                return 'message-personal';
        }
    }

    /**
     * Возвращает отображаемое имя отправителя сообщения.
     * Приоритет: "Вы" (если isOwn), firstName + lastName, иначе login.
     * @param {FrontendMessage} message - Объект сообщения.
     * @returns {string} Имя для отображения.
     * @private
     */
    private getSenderDisplayName(message?: FrontendMessage): string | null {
        if (!message) return null;
        if (message.isOwn) return "Вы";

        const { firstName, lastName, login } = message.sender;
        
        if ((!login || login === 'unknown' || login.startsWith('user_')) && !firstName && !lastName) {
            return null;
        }

        const fullName = `${firstName || ''} ${lastName || ''}`.trim();
        return fullName || login;
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
                src: this.props.chat.avatarUrl || "/assets/images/avatars/defaultAvatar.svg",
            });
            this.avatar.mount(avatarSlot as HTMLElement);
        }

        const infoSlot = this.element.querySelector('[data-component="chat-item-info-slot"]');
        if (infoSlot) {
            const lastMessagePreview = getLastMessagePreview(this.props.chat.lastMessage);
            this.chatInfo = new ChatInfo({
                class: this.typeToClass(this.props.chat.type),
                name: this.props.chat.title,
                lastMessage: lastMessagePreview.text,
                lastMessageIcon: lastMessagePreview.iconSrc,
                sender: this.getSenderDisplayName(this.props.chat.lastMessage),
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
     * Форматирует время последнего сообщения с валидацией.
     * @param {string | Date} [timestamp] - Временная метка.
     * @returns {string} Отформатированное время или пустая строка.
     * @private
     */
    private formatTime(timestamp?: string | Date): string {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
            return '';
        }
        
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
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
     * Точечно обновляет DOM-элементы компонента на основе новых данных чата.
     * Используется для WS-обновлений без полной перерисовки (unmount/mount).
     * 
     * @param {ChatType} newData - Новые данные чата.
     */
    public update(newData: ChatType): void {
        this.props.chat = newData;
        this.props.formattedLastMessageTime = newData.lastMessage ? this.formatTime(newData.lastMessage.timestamp) : '';

        if (!this.element) return;

        const avatarImg = this.element.querySelector<HTMLImageElement>('.chat-avatar');
        if (avatarImg) {
            avatarImg.src = newData.avatarUrl || "/assets/images/avatars/defaultAvatar.svg";
        }

        const nameEl = this.element.querySelector('.user-name .name-text, .group-name .name-text, .chanel-name .name-text');
        if (nameEl) {
            nameEl.textContent = newData.title;
        }

        const msgTextEl = this.element.querySelector<HTMLElement>('.msg-text');
        if (msgTextEl) {
            const senderName = newData.type === 'group' ? this.getSenderDisplayName(newData.lastMessage) : null;
            this.renderLastMessagePreview(msgTextEl, newData.lastMessage, senderName);
        }

        const timeEl = this.element.querySelector('.meta-chat-info__time');
        if (timeEl) {
            timeEl.textContent = this.props.formattedLastMessageTime || '';
        }

        const unreadCountEl = this.element.querySelector('.meta-chat-info__unread-count');
        if (unreadCountEl) {
            if (newData.unreadCount && newData.unreadCount > 0) {
                unreadCountEl.textContent = formatUnreadBadge(newData.unreadCount);
                // Стираем inline display, чтобы CSS-правила (flex-центрирование)
                // снова стали активны — иначе display:block ломает выравнивание текста.
                (unreadCountEl as HTMLElement).style.display = '';
            } else {
                (unreadCountEl as HTMLElement).style.display = 'none';
            }
        }
    }

    private renderLastMessagePreview(container: HTMLElement, message?: FrontendMessage, senderName?: string | null): void {
        container.textContent = '';

        if (senderName) {
            const sender = document.createElement('span');
            sender.className = 'sender-group';
            sender.textContent = `${senderName}:`;
            container.appendChild(sender);
        }

        const preview = getLastMessagePreview(message);
        if (preview.iconSrc) {
            const icon = document.createElement('img');
            icon.className = 'msg-text__icon';
            icon.src = preview.iconSrc;
            icon.alt = '';
            container.appendChild(icon);
        }

        const label = document.createElement('span');
        label.className = 'msg-text__label';
        label.textContent = preview.text;
        container.appendChild(label);
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
