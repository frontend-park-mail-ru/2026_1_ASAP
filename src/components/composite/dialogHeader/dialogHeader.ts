import { BaseComponent } from '../../../core/base/baseComponent.js';
import { User, DialogChat } from '../../../types/chat.js';
import { Avatar } from '../../ui/avatar/avatar.js';

/**
 * @interface DialogHeaderProps - Свойства компонента шапки диалога.
 * @property {DialogChat} chat - Объект диалогового чата.
 */
interface DialogHeaderProps {
    chat: DialogChat;
}

/**
 * Компонент шапки для личного диалога.
 * Отображает аватар, имя собеседника и его статус.
 */
export class DialogHeader extends BaseComponent {
    private avatarComponent: Avatar | null = null;

    /**
     * @param {DialogHeaderProps} props - Свойства компонента.
     */
    constructor(props: DialogHeaderProps) {
        super(props);
        this.tempName = 'components/composite/dialogHeader/dialogHeader';
        this.props.chat = props.chat;
    }

    /**
     * @override
     */
    protected afterMount() {
        if (!this.element) {
            console.error("dialogHeader: нет эллемента для монтирования");
            return;
        }
        const avatarSlot = this.element.querySelector('[data-component="dialog-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.chat.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'dialog-header__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }
    }

    protected beforeUnmount() {
        this.avatarComponent?.unmount();
    }
}