import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FrontendMessage } from '../../../types/chat';
import template from './message.hbs';
import { Avatar } from '../../ui/avatar/avatar';

/**
 * @interface MessageProps - Свойства компонента сообщения.
 * @property {FrontendMessage} message - Объект сообщения.
 * @property {boolean} isOwn - Флаг, является ли сообщение текущего пользователя.
 * @property {boolean} showAuthor - Флаг, нужно ли показывать имя автора.
 */
interface MessageProps extends IBaseComponentProps {
    message: FrontendMessage;
    isOwn: boolean;
    showAuthor: boolean   
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
        this.props.showAuthor = props.showAuthor;
        this.props.formattedTime = props.message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getTemplate() {
        return template;
    }

    private avatarComponent: Avatar | null = null;

    /**
     * @override
     */
    protected afterMount(): void {
        if (!this.element) {
            console.error("message: нет эллемента для монтирования");
            return;
        }
        const avatarSlot = this.element.querySelector('[data-component="message-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.message.sender.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'message__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
    }
}