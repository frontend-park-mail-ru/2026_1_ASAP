import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';

export class MenuBar extends BaseForm {
    render() {
        const menuBar = document.createElement('div');
        menuBar.className = "menu-bar";
        menuBar.innerHTML = `
            <div class="menu-buttons"></div>
        `;
        return menuBar;
    }

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
        });
        this.settingsButton.mount(this.element);
    }
}