import { BaseForm } from "../../../core/base/baseForm";
import { ChatItem } from "../chatItem/chatItem";
import { chatService } from "../../../services/chatService";
import { Router } from '../../../core/router';
import { wsClient, MessageDto } from '../../../core/utils/wsClient';
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

    /**
     * Стрелочная функция-обработчик WS-события «message.New».
     * Хранится как поле класса, чтобы иметь возможность отписаться в beforeUnmount.
     */
    private readonly handleNewWsMessage = (dto: MessageDto): void => {
        const chatId = dto.chat_id.toString();
        this.updateLastMessage(chatId, dto.text);
        this.moveChatToTop(chatId);
    };

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
     * Также подписывается на WS-событие «message.New» для обновления превью.
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

        // Подписываемся на входящие сообщения для обновления превью в сайдбаре
        wsClient.subscribe('message.New', this.handleNewWsMessage);
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает список, размонтируя все `ChatItem`, удаляет сообщение об отсутствии чатов
     * и **отписывается** от WS-событий для предотвращения утечек памяти.
     */
    beforeUnmount() {
        // Отписываемся от WS
        wsClient.unsubscribe('message.New', this.handleNewWsMessage);

        this.chatItems.forEach(item => item.unmount());
        this.chatItems = [];
        this.activeChatId = null;
        this.noChatsElement?.remove();
    }

    /**
     * Обновляет текст последнего сообщения у чата в сайдбаре без перерисовки списка.
     * Находит нужный DOM-элемент `.chat-info__last-message` внутри соответствующего ChatItem.
     * @param {string} chatId - ID чата, у которого обновляем превью.
     * @param {string} text   - Новый текст последнего сообщения.
     */
    public updateLastMessage(chatId: string, text: string): void {
        const targetItem = this.chatItems.find(item => String(item.props.chat.id) === String(chatId));
        if (!targetItem?.element) {
            console.warn(`[WS] Чат с ID ${chatId} не найден в сайдбаре для обновления сообщения`);
            return;
        }

        const lastMsgEl = targetItem.element.querySelector<HTMLElement>('.msg-text');
        if (lastMsgEl) {
            lastMsgEl.textContent = text;
        } else {
            console.warn(`[WS] Элемент .msg-text не найден в ChatItem для чата ${chatId}`);
        }
    }

    /**
     * Перемещает элемент чата в начало DOM-списка (визуально «поднимает» чат наверх).
     * Также переставляет соответствующий `ChatItem` в начало массива `chatItems`.
     * @param {string} chatId - ID чата для перемещения.
     */
    public moveChatToTop(chatId: string): void {
        if (!this.element) return;

        const index = this.chatItems.findIndex(item => String(item.props.chat.id) === String(chatId));
        if (index <= 0) return; // уже наверху или не найден

        const [targetItem] = this.chatItems.splice(index, 1);
        this.chatItems.unshift(targetItem);

        if (targetItem.element) {
            this.element.prepend(targetItem.element);
        }
    }
}