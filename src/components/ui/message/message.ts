import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent.js";
import { FrontendMessage } from '../../../types/chat.js';

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
        this.tempName = 'components/ui/message/message';

        this.props.isOwn = props.isOwn;
        this.props.formattedTime = props.message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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