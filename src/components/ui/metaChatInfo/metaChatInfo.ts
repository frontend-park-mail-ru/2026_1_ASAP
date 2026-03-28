import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent.js";
import template from "./metaChatInfo.hbs";

/**
 * @interface MetaChatInfoProps - Свойства компонента метаинформации чата.
 * @property {string} [lastMessageTime] - Время последнего сообщения (строка).
 * @property {number} [unreadCount] - Количество непрочитанных сообщений.
 */
export interface MetaChatInfoProps extends IBaseComponentProps {
    lastMessageTime?: string;
    unreadCount?: number;
}

/**
 * Компонент метаинформации чата (время, счётчик непрочитанных).
 */
export class MetaChatInfo extends BaseComponent<MetaChatInfoProps> {
    /**
     * @param {MetaChatInfoProps} [props={}] - Свойства.
     */
    constructor(props: MetaChatInfoProps = {}) {
        super(props);
        // Присваиваем свойства в this.props для Handlebars
        this.props.lastMessageTime = props.lastMessageTime;
        this.props.unreadCount = props.unreadCount;
    }

    getTemplate() {
        return template;
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