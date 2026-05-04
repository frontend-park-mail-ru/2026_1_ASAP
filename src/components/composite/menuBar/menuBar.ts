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
    onContactsClick?: () => void;
}

export type MenuButtonType = 'settings' | 'messages' | 'contacts';

/**
 * Нижнее меню с кнопками навигации.
 */
export class MenuBar extends BaseComponent<MenuBarProps> {
    private contactsButton: Button | null = null;
    private messagesButton: Button | null = null;
    private settingsButton: Button | null = null;

    private contactsAnimEnd: (() => void) | null = null;
    private messagesAnimEnd: (() => void) | null = null;
    private settingsAnimEnd: (() => void) | null = null;

    constructor(props: MenuBarProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    public setActiveButton(active: MenuButtonType): void {
        const messageImg = this.messagesButton?.element?.querySelector('img');
        const settingsImg = this.settingsButton?.element?.querySelector('img');
        const contactsImg = this.contactsButton?.element?.querySelector('img');

        if (!messageImg || !settingsImg || !contactsImg) return;

        const animClasses = ['icon-anim--spring-pop', 'icon-anim--jelly-squeeze', 'icon-anim--smooth-rotate'];
        [messageImg, settingsImg, contactsImg].forEach(img => img.classList.remove(...animClasses));

        if (this.settingsAnimEnd) { settingsImg.removeEventListener('animationend', this.settingsAnimEnd); this.settingsAnimEnd = null; }
        if (this.messagesAnimEnd) { messageImg.removeEventListener('animationend', this.messagesAnimEnd); this.messagesAnimEnd = null; }
        if (this.contactsAnimEnd) { contactsImg.removeEventListener('animationend', this.contactsAnimEnd); this.contactsAnimEnd = null; }

        if (active === 'settings') {
            messageImg.src = '/assets/images/icons/primaryMenuMsgs.svg';
            settingsImg.src = '/assets/images/icons/clickedMenuSettings.svg';
            contactsImg.src = '/assets/images/icons/primaryMenuContacts.svg';
            void settingsImg.offsetWidth;
            settingsImg.classList.add('icon-anim--smooth-rotate');

            this.settingsAnimEnd = () => { 
                settingsImg.classList.remove('icon-anim--smooth-rotate'); 
                this.settingsAnimEnd = null; 
            };
            settingsImg.addEventListener('animationend', this.settingsAnimEnd, { once: true });

        } else if (active === 'messages') {
            messageImg.src = '/assets/images/icons/clickedMenuMsgs.svg';
            settingsImg.src = '/assets/images/icons/primaryMenuSettings.svg';
            contactsImg.src = '/assets/images/icons/primaryMenuContacts.svg';
            void messageImg.offsetWidth;
            messageImg.classList.add('icon-anim--jelly-squeeze');

            this.messagesAnimEnd = () => { 
                messageImg.classList.remove('icon-anim--jelly-squeeze'); 
                this.messagesAnimEnd = null; 
            };
            messageImg.addEventListener('animationend', this.messagesAnimEnd, { once: true });

        } else {
            messageImg.src = '/assets/images/icons/primaryMenuMsgs.svg';
            settingsImg.src = '/assets/images/icons/primaryMenuSettings.svg';
            contactsImg.src = '/assets/images/icons/clickedMenuContacts.svg';
            void contactsImg.offsetWidth;
            contactsImg.classList.add('icon-anim--spring-pop');

            this.contactsAnimEnd = () => { 
                contactsImg.classList.remove('icon-anim--spring-pop'); 
                this.contactsAnimEnd = null; 
            };
            contactsImg.addEventListener('animationend', this.contactsAnimEnd, { once: true });
        }
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.contactsButton = new Button({ 
            class: "menu-button", 
            icon: "/assets/images/icons/primaryMenuContacts.svg",
            onClick: this.props.onContactsClick 
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
        const messageImg = this.messagesButton?.element?.querySelector('img');
        const settingsImg = this.settingsButton?.element?.querySelector('img');
        const contactsImg = this.contactsButton?.element?.querySelector('img');
        if (this.settingsAnimEnd && settingsImg){
            settingsImg.removeEventListener('animationend', this.settingsAnimEnd);
        }
        if (this.messagesAnimEnd && messageImg) {
            messageImg.removeEventListener('animationend', this.messagesAnimEnd);
        }
        if (this.contactsAnimEnd && contactsImg) {
            contactsImg.removeEventListener('animationend', this.contactsAnimEnd);
        }
        this.contactsButton?.unmount();
        this.messagesButton?.unmount();
        this.settingsButton?.unmount();
    }
}