import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage } from '../../../types/chat';
import template from './message.hbs';

/**
 * @interface MessageProps - Свойства компонента сообщения.
 * @property {FrontendMessage} message - Объект сообщения.
 * @property {boolean} isOwn - Флаг, является ли сообщение текущего пользователя.
 */
interface MessageProps extends IBaseComponentProps {
    message: FrontendMessage;
    isOwn: boolean;
}

/**
 * Компонент для отображения одного сообщения в диалоге.
 */
export class Message extends BaseComponent<MessageProps> {
    /**
     * @param {MessageProps} props - Свойства компонента.
     */
    constructor(props: MessageProps) {
        super(props);

        this.props.isOwn = props.isOwn;
        this.props.formattedTime = props.message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getTemplate() {
        return template;
    }

    /**
     * @override
     */
    protected afterMount(): void { 
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
    }
}