import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent.js";

/**
 * @interface ChatInfoProps - Свойства компонента информации о чате.
 * @property {string} class - Тип чата ('message-personal' | 'message-group' | 'message-chanel').
 * @property {string} [name] - Имя чата/собеседника.
 * @property {string} [lastMessage] - Последнее сообщение.
 * @property {string} [sender] - Отправитель (для групповых чатов).
 * @property {Function} [onClick] - Обработчик клика.
 */
export interface ChatInfoProps extends IBaseComponentProps {
    class: string;
    name?: string;
    lastMessage?: string;
    sender?: string;
    onClick?: (event: MouseEvent) => void;
}

/**
 * Компонент информации о чате (имя, последнее сообщение).
 * Отображается по-разному для личных чатов, групп и каналов.
 */
export class ChatInfo extends BaseComponent<ChatInfoProps> {
    /**
     * @param {ChatInfoProps} [props={}] - Свойства.
     */
    constructor(props: ChatInfoProps) {
        super(props);
        this.tempName = "components/ui/chatInfo/chatInfo";
        this.props.class = props.class;
        this.props.name = props.name;
        this.props.lastMessage = props.lastMessage;
        this.props.sender = props.sender;
    }

    /**
     * @override
     */
    protected afterMount(): void {
        if (this.props.onClick) {
            this.element?.addEventListener("click", this.props.onClick as EventListener);
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
        if (this.props.onClick) {
            this.element?.removeEventListener("click", this.props.onClick as EventListener);
        }
    }
}