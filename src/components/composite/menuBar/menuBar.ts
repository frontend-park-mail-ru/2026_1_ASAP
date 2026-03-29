import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { Button } from '../../ui/button/button';
import template from "./menuBar.hbs";

/**
 * @interface MenuBarProps - Свойства для MenuBar.
 * @property {Function} onMessagesClick - Колбэк при клике на "Сообщения".
 * @property {Function} onSettingsClick - Колбэк при клике на "Настройки".
 */
interface MenuBarProps extends IBaseComponentProps {
    onMessagesClick?: () => void;
    onSettingsClick?: () => void;
}

/**
 * Нижнее меню с кнопками навигации.
 */
export class MenuBar extends BaseComponent<MenuBarProps> {
    private contactsButton: Button | null = null;
    private messagesButton: Button | null = null;
    private settingsButton: Button | null = null;

    constructor(props: MenuBarProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    public setActiveButton(active: 'settings' | 'messages'): void {
        const messageImg = this.messagesButton?.element?.querySelector('img');
        const settingsImg = this.settingsButton?.element?.querySelector('img');

        if (!messageImg || !settingsImg) return;

        if (active === 'settings') {
            messageImg.src = '/assets/images/icons/primaryMenuMsgs.svg';
            settingsImg.src = '/assets/images/icons/clickedMenuSettings.svg';
        } else {
            messageImg.src = '/assets/images/icons/clickedMenuMsgs.svg';
            settingsImg.src = '/assets/images/icons/primaryMenuSettings.svg';
        }
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.contactsButton = new Button({ 
            class: "menu-button", 
            icon: "/assets/images/icons/primaryMenuContacts.svg" 
        });
        this.contactsButton.mount(this.element);

        this.messagesButton = new Button({ 
            class: "menu-button", 
            icon: "/assets/images/icons/clickedMenuMsgs.svg", 
            onClick: this.props.onMessagesClick });
        this.messagesButton.mount(this.element);

        this.settingsButton = new Button({ 
            class: "menu-button", 
            icon: "/assets/images/icons/primaryMenuSettings.svg", 
            onClick: this.props.onSettingsClick });
        this.settingsButton.mount(this.element);
    }

    protected beforeUnmount(): void {
        this.contactsButton?.unmount();
        this.messagesButton?.unmount();
        this.settingsButton?.unmount();
    }
}