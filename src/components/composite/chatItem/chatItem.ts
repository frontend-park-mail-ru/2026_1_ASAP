import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import { ChatInfo } from "../../ui/chatInfo/chatInfo";
import { MetaChatInfo } from "../../ui/metaChatInfo/metaChatInfo";
import { Chat as ChatType } from '../../../types/chat';
import { chatService } from "../../../services/chatService";    
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
    private loadingSenderIds: Set<number> = new Set();

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
     * Возвращает отображаемое имя отправителя сообщения.
     * Приоритет: "Вы" (если isOwn), firstName + lastName, иначе login.
     * @param {any} message - Объект сообщения.
     * @returns {string} Имя для отображения.
     * @private
     */
    private getSenderDisplayName(message?: any): string | null {
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
     * Асинхронно загружает профиль отправителя и обновляет DOM.
     * @param {number} senderId - ID отправителя.
     * @private
     */
    private async fetchAndSetSenderName(senderId: number) {
        if (this.loadingSenderIds.has(senderId)) {
            return;
        }
        this.loadingSenderIds.add(senderId);

        try {
            const profile = await chatService.getUserProfile(senderId);
            if (profile && this.props.chat.lastMessage) {
                this.props.chat.lastMessage.sender = {
                    ...this.props.chat.lastMessage.sender,
                    ...profile
                };

                if (this.avatar && profile.avatarUrl) {
                    this.avatar.props.src = profile.avatarUrl;
                    const img = this.avatar.element?.querySelector('img');
                    if (img) {
                        img.src = profile.avatarUrl;
                    }
                }

                const msgTextEl = this.element?.querySelector('.msg-text');
                if (msgTextEl) {
                    const senderName = this.getSenderDisplayName(this.props.chat.lastMessage);
                    if (senderName) {
                        msgTextEl.innerHTML = `<span class="sender-group">${senderName}: </span>${this.props.chat.lastMessage.text}`;
                    }
                }
            }
        } catch (error) {
        } finally {
            this.loadingSenderIds.delete(senderId);
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
                src: this.props.chat.avatarUrl || "/assets/images/avatars/chatAvatar.svg",
            });
            this.avatar.mount(avatarSlot as HTMLElement);
        }

        const infoSlot = this.element.querySelector('[data-component="chat-item-info-slot"]');
        if (infoSlot) {
            this.chatInfo = new ChatInfo({
                class: this.typeToClass(this.props.chat.type),
                name: this.props.chat.title,
                lastMessage: this.props.chat.lastMessage?.text,
                sender: this.getSenderDisplayName(this.props.chat.lastMessage),
            });
            this.chatInfo.mount(infoSlot as HTMLElement);
        }

        if (this.props.chat.type === 'group' && this.props.chat.lastMessage) {
            const senderName = this.getSenderDisplayName(this.props.chat.lastMessage);
            const senderId = this.props.chat.lastMessage.sender.id;
            
            if (!senderName && senderId && !this.props.chat.lastMessage.isOwn) {
                this.fetchAndSetSenderName(senderId);
            }
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
     * Точечно обновляет DOM-элементы компонента на основе новых данных чата.
     * Используется для WS-обновлений без полной перерисовки (unmount/mount).
     * 
     * @param {ChatType} newData - Новые данные чата.
     */
    public update(newData: ChatType): void {
        this.props.chat = newData;
        this.props.formattedLastMessageTime = newData.lastMessage?.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (!this.element) return;

        const avatarImg = this.element.querySelector<HTMLImageElement>('.chat-avatar');
        if (avatarImg) {
            avatarImg.src = newData.avatarUrl || "../../../assets/images/avatars/chatAvatar.svg";
        }

        const nameEl = this.element.querySelector('.user-name, .group-name, .chanel-name');
        if (nameEl) {
            nameEl.textContent = newData.title;
        }

        const msgTextEl = this.element.querySelector('.msg-text');
        if (msgTextEl) {
            if (newData.type === 'group' && newData.lastMessage) {
                const senderName = this.getSenderDisplayName(newData.lastMessage);
                if (senderName) {
                    msgTextEl.innerHTML = `<span class="sender-group">${senderName}: </span>${newData.lastMessage.text}`;
                } else {
                    msgTextEl.textContent = newData.lastMessage.text || '';
                    
                    // Если имени нет, но есть ID — запускаем загрузку
                    const senderId = newData.lastMessage.sender.id;
                    if (senderId && !newData.lastMessage.isOwn) {
                        this.fetchAndSetSenderName(senderId);
                    }
                }
            } else {
                msgTextEl.textContent = newData.lastMessage?.text || '';
            }
        }

        const timeEl = this.element.querySelector('.meta-chat-info__time');
        if (timeEl) {
            timeEl.textContent = this.props.formattedLastMessageTime || '';
        }

        const unreadCountEl = this.element.querySelector('.meta-chat-info__unread-count');
        if (unreadCountEl) {
            if (newData.unreadCount && newData.unreadCount > 0) {
                unreadCountEl.textContent = String(newData.unreadCount);
                (unreadCountEl as HTMLElement).style.display = 'block';
            } else {
                (unreadCountEl as HTMLElement).style.display = 'none';
            }
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