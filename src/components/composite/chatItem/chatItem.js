import { BaseForm } from "../../../core/base/baseForm.js";
import { Avatar } from "../../ui/avatar/avatar.js";
import { ChatInfo } from "../../ui/chatInfo/chatInfo.js";
import { MetaChatInfo } from "../../ui/metaChatInfo/metaChatInfo.js";

/**
 * Элемент списка чатов. Содержит аватар, информацию о чате и метаданные.
 */
export class ChatItem extends BaseForm {
    /**
     * @param {object} [props={}] - Свойства.
     * @param {string} [props.class] - CSS-класс.
     * @param {string} [props.name] - Имя чата.
     * @param {string} [props.lastMessage] - Последнее сообщение.
     * @param {string} [props.dialogClass] - Тип диалога ('group' | 'channel' | 'dialog').
     * @param {string} [props.sender] - Логин отправителя.
     * @param {Function} [props.onClick] - Обработчик клика.
     */
    constructor(props={}) {
        super(props);
        this.tempName = "components/composite/chatItem/chatItem";
    };

    /**
     * Преобразует тип диалога в CSS-класс для ChatInfo.
     * @returns {string}
     */
    typeToClass() {
        switch (this.props.dialogClass) {
            case 'group':   return 'message-group';
            case 'channel': return 'message-chanel';
            default:        return 'message-personal';
        }
    }

    /**
     * Хук жизненного цикла, вызываемый после монтирования компонента в DOM.
     *
     * Создаёт и монтирует дочерние компоненты:
     * - {@link Avatar} — аватар чата;
     * - {@link ChatInfo} — имя и последнее сообщение;
     * - {@link MetaChatInfo} — время и счётчик непрочитанных.
     *
     * Если передан `props.onClick`, навешивает обработчик `click` на корневой элемент.
     */
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

    /**
     * Хук жизненного цикла, вызываемый перед размонтированием компонента.
     *
     * Снимает обработчик `click`, если он был установлен в {@link afterMount}.
     *
     */
    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener('click', this.props.onClick);
        }
    };
}