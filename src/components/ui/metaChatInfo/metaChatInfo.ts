import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent.js";

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
        this.tempName = 'components/ui/metaChatInfo/metaChatInfo';
        // Присваиваем свойства в this.props для Handlebars
        this.props.lastMessageTime = props.lastMessageTime;
        this.props.unreadCount = props.unreadCount;
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