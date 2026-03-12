import { BaseComponent } from "../../../core/base/baseComponent.js";

/**
 * Компонент информации о чате (имя, последнее сообщение).
 * Отображается по-разному для личных чатов, групп и каналов.
 */
export class ChatInfo extends BaseComponent {
    /**
     * @param {object} [props={}] - Свойства.
     * @param {string} props.class - Тип чата ('message-personal' | 'message-group' | 'message-chanel').
     * @param {string} [props.name] - Имя чата/собеседника.
     * @param {string} [props.lastMessage] - Последнее сообщение.
     * @param {string} [props.sender] - Отправитель (для групповых чатов).
     * @param {Function} [props.onClick] - Обработчик клика.
     */
    constructor(props={}) {
        super(props);
        this.tempName = "components/ui/chatInfo/chatInfo";
    };


    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        if (this.props.onClick) {
            this.element.addEventListener("click", this.props.onClick);
        }
    };


    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    };
}