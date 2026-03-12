import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';

/**
 * Нижнее меню с кнопками навигации: контакты, сообщения, настройки.
 */
export class MenuBar extends BaseForm {
    constructor(props={}) {
        super(props);
        this.tempName = "components/composite/menuBar/menuBar";
    }

    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        this.contactsButton = new Button({
            class: "menu-button",
            icon: "../../../assets/images/icons/primaryMenuContacts.svg",
        });
        this.contactsButton.mount(this.element);

        this.messagesButton = new Button({
            class: "menu-button",
            icon: "../../../assets/images/icons/clickedMenuMsgs.svg",
        });
        this.messagesButton.mount(this.element);

        this.settingsButton = new Button({
            class: "menu-button",
            icon: "../../../assets/images/icons/primaryMenuSettings.svg",
            onClick: this.props.onSettingsClick
        });
        this.settingsButton.mount(this.element);
    }
}