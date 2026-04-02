import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createChatMenu.hbs';
import { Button } from "../../ui/button/button";


interface createChatMenuProps extends IBaseComponentProps {
    onCreateDialog: () => void;
    onCreateGroup: () => void;
    onCreateChannel: () => void; // пока не используется
    onClose: () => void;
}

export class CreateChatMenu extends BaseComponent<createChatMenuProps> {
    private dialogButton: Button | null = null;
    private groupButton: Button | null = null
    private channelButton: Button | null = null;
    private overlay: HTMLElement | null = null;
    private handleOverlayClick = () => {
        this.props.onClose();
    }

    constructor (props: createChatMenuProps) {
        super(props);
        this.props.onCreateDialog = props.onCreateDialog;
        this.props.onCreateGroup = props.onCreateGroup;
        this.props.onCreateChannel = props.onCreateChannel;
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("createChatMenu: нет эллемента для монтирования");
            return;
        }
        const buttonsContainer = this.element.querySelector('[data-component="create-chat__button-container"]');


        this.dialogButton = new Button({
            label: "Создать диалог",
            class: "ui-button create-chat-menu__add-button",
            onClick: this.props.onCreateDialog,
            icon: "/assets/images/icons/createChatMenuIcons/dialog.svg"
        });
        this.dialogButton.mount(buttonsContainer as HTMLElement);

        this.groupButton = new Button({
            label: "Создать группу",
            class: "ui-button create-chat-menu__add-button",
            onClick: this.props.onCreateGroup,
            icon: "/assets/images/icons/createChatMenuIcons/group.svg"

        });
        this.groupButton.mount(buttonsContainer as HTMLElement);

        this.channelButton = new Button({
            label: "Создать канал",
            class: "ui-button create-chat-menu__add-button",
            onClick: this.props.onCreateChannel,
            icon: "/assets/images/icons/createChatMenuIcons/channel.svg",   
            disabled: true // пока не используется
        })
        this.channelButton.mount(buttonsContainer as HTMLElement);

        this.overlay = this.element.querySelector('[data-component="create-chat-overlay"]')
        this.overlay.addEventListener("click", this.handleOverlayClick);
    }

    protected beforeUnmount(): void { 
        super.beforeUnmount();
        if (!this.element) {
            console.error("createChatMenu: нет эллемента для размонтирования");
            return;
        }
        this.dialogButton.unmount();
        this.groupButton.unmount();
        this.channelButton.unmount();
        this.overlay.removeEventListener("click", this.handleOverlayClick);
    }
}