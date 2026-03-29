import { BaseComponent } from '../../../core/base/baseComponent';
import { User, DialogChat } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import template from './dialogHeader.hbs';
import { Button } from '../../ui/button/button';
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
    private settingsButton: Button | null = null;

    /**
     * @param {DialogHeaderProps} props - Свойства компонента.
     */
    constructor(props: DialogHeaderProps) {
        super(props);
        this.props.chat = props.chat;
    }

    getTemplate() {
        return template;
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

        const settingsSlot = this.element.querySelector('[data-component="dialog-settings-slot"]');
        if (settingsSlot) {
            this.settingsButton = new Button({
                class: "dialog-header__settings",
                label: "",
                icon: "/assets/images/icons/dialogSettings.svg",
                type: "button"
            })
            this.settingsButton.mount(settingsSlot as HTMLElement);
        }
    }

    protected beforeUnmount() {
        this.avatarComponent?.unmount();
        this.settingsButton?.unmount();
    }
}