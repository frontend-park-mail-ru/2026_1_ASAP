import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from './deleteChatMenu.hbs';
    

interface deleteChatMenuProps extends IBaseComponentProps {
    onInfo: () => void;
    onDelete: () => void;
    onClose: () => void;
    typeChat: "dialog" | "group" | "channel";
}

export class DeleteChatMenu extends BaseComponent<deleteChatMenuProps> {
    private infoButton: Button | null = null;
    private deleteButton: Button | null = null
    private overlay: HTMLElement | null = null;

    constructor (props: deleteChatMenuProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("deleteChatMenu: нет эллемента для монтирования");
            return;
        }
        const buttonsContainer = this.element.querySelector('[data-component="delete-chat__button-container"]');
        
        this.infoButton = new Button({
            label: "Информация",
            class: "ui-button delete-chat-menu__button",
            onClick: this.props.onInfo,
            icon: "/assets/images/icons/deleteChatMenuIcons/info.svg"
        });
        this.infoButton.mount(buttonsContainer as HTMLElement);

        let label = "" 
        switch (this.props.typeChat) {
            case "dialog":
                label = "Удалить диалог";
                break;
            case "group":
                label = "Удалить группу";
                break;
            case "channel":
                label = "Удалить канал";
                break;
        }


        this.deleteButton = new Button({
            label: label,
            class: "ui-button delete-chat-menu__button",
            onClick: this.props.onDelete,
            icon: "/assets/images/icons/deleteChatMenuIcons/delete.svg"
        });
        this.deleteButton.mount(buttonsContainer as HTMLElement);

        this.overlay = this.element.querySelector('[data-component="delete-chat-overlay"]');
        this.overlay?.addEventListener('click', this.props.onClose);
    }

    protected beforeUnmount(): void {
        this.infoButton?.unmount();
        this.deleteButton?.unmount();
        this.overlay?.removeEventListener('click', this.props.onClose); 
    }
}