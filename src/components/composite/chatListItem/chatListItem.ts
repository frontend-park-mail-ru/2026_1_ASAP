import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { chatService } from "../../../services/chatService";
import { Router } from '../../../core/router';
import template from "./chatListItem.hbs";

const CURRENT_USER_LOGIN = 'bob'; // Заглушка для теста, потом убрать


/**
 * @interface ChatListItemProps
 * @description Свойства для компонента, отображающего список чатов.
 * @property {Router} router - Экземпляр роутера для навигации.
 * @property {string | null} activeChatId - ID активного (выбранного) чата.
 */
interface ChatListItemProps {
    router: Router;
    activeChatId: string | null;
}

/**
 * @class ChatListItem
 * @extends BaseForm
 * @description Компонент, который отображает список чатов пользователя.
 * Он загружает данные о чатах, управляет их отображением и выбором активного чата.
 *
 * @property {ChatItem[]} chatItems - Массив экземпляров компонентов `ChatItem`.
 * @property {string | null} activeChatId - ID текущего активного чата.
 * @property {HTMLElement | null} noChatsElement - Элемент, отображаемый при отсутствии чатов.
 */
export class ChatListItem extends BaseForm<ChatListItemProps> {
    private chatItems: ChatItem[] = [];
    private activeChatId: string | null = null;
    private noChatsElement: HTMLElement | null = null;

    constructor(props: ChatListItemProps) {
        super(props);
        this.activeChatId = props.activeChatId;
    }

    getTemplate() {
        return template;
    }

    /**
     * Обработчик клика по элементу чата. Выполняет навигацию на страницу выбранного чата.
     * @param {ChatItem} clickedItem - Экземпляр `ChatItem`, по которому был выполнен клик.
     * @private
     */
    private handleChatClick = (clickedItem: ChatItem) => {
        const chatId = clickedItem.props.chat.id as string;
        this.props.router.navigate(`/chats/${chatId}`);
    }

    /**
     * Устанавливает активный чат в списке, подсвечивая его.
     * @param {string | null} chatId - ID чата, который нужно сделать активным.
     */
    public setActiveChat(chatId: string | null): void {
        this.activeChatId = chatId;
        this.chatItems.forEach(item => {
            if (item.element) {
                if ((item.props.chat.id as string) === chatId) {
                    item.element.classList.remove("chat-item--default");
                    item.element.classList.add("chat-item--selected");
                } else {
                    item.element.classList.remove("chat-item--selected");
                    item.element.classList.add("chat-item--default");
                }
            }
        });
    }

    /**
     * Выполняется после монтирования компонента.
     * Загружает список чатов с помощью `chatService`, создает и монтирует
     * для каждого чата компонент `ChatItem`. Если чатов нет, отображает соответствующее сообщение.
     * @protected
     */
    protected afterMount() {
        this.chatItems = [];

        chatService.getChats(CURRENT_USER_LOGIN).then(chats => {
            if (!this.element) {
                console.error("ChatListItem: компонент не имеет элемента при afterMount.");
                return;
            }

            if (chats.length === 0) {
                this.element.classList.add('chat-list--empty');
                this.noChatsElement = document.createElement('p');
                this.noChatsElement.className = "no-chats";
                this.noChatsElement.innerHTML = "У вас пока нет чатов,<br> скорее напишите кому нибудь!";
                this.element.appendChild(this.noChatsElement);
                return;
            }

            chats.forEach(chat => {
                const item = new ChatItem({
                    class: (chat.id === this.activeChatId) ? 'chat-item--selected' : 'chat-item--default',
                    chat: chat,
                    onClick: (clickedItem: ChatItem) => this.handleChatClick(clickedItem)
                });

                item.mount(this.element!);
                this.chatItems.push(item);
            });
        });
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает список, размонтируя все `ChatItem`, и удаляет сообщение об отсутствии чатов.
     */
    beforeUnmount() {
        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.activeChatId = null;
        this.noChatsElement?.remove();
    }
}