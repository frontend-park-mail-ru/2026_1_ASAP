import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from './deleteChatMenu.hbs';
import { replayAnimation } from "../../../core/utils/replayAnimation";
    

interface deleteChatMenuProps extends IBaseComponentProps {
    onInfo: () => void;
    onDelete: () => void;
    onClose: () => void;
    typeChat: "dialog" | "group" | "channel";
}

export class DeleteChatMenu extends BaseComponent<deleteChatMenuProps> {
    private infoButton: Button | null = null;
    private deleteButton: Button | null = null;
    private overlay: HTMLElement | null = null;

    private infoEnter: (() => void) | null = null;
    private infoLeave: (() => void) | null = null;
    private deleteEnter: (() => void) | null = null;
    private deleteLeave: (() => void) | null = null;

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
            class: "delete-chat-menu__button",
            onClick: this.props.onInfo,
            icon: "/assets/images/icons/Info.svg"
        });
        this.infoButton.mount(buttonsContainer as HTMLElement);

        let label = "";
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
            class: "delete-chat-menu__button delete-chat-menu__button-red",
            onClick: this.props.onDelete,
            icon: "/assets/images/icons/deleteAvatar.svg"
        });
        this.deleteButton.mount(buttonsContainer as HTMLElement);

        const infoImg = this.infoButton.element?.querySelector('img') as HTMLImageElement | null;
        if (infoImg) {
            this.infoEnter = () => replayAnimation(infoImg, 'icon-anim--spring-pop');
            this.infoLeave = () => infoImg.classList.remove('icon-anim--spring-pop');
            this.infoButton.element!.addEventListener('mouseenter', this.infoEnter);
            this.infoButton.element!.addEventListener('mouseleave', this.infoLeave);
        }

        const delImg = this.deleteButton.element?.querySelector('img') as HTMLImageElement | null;
        if (delImg) {
            this.deleteEnter = () => replayAnimation(delImg, 'icon-anim--danger-shake');
            this.deleteLeave = () => delImg.classList.remove('icon-anim--danger-shake');
            this.deleteButton.element!.addEventListener('mouseenter', this.deleteEnter);
            this.deleteButton.element!.addEventListener('mouseleave', this.deleteLeave);
        }

        this.overlay = this.element.querySelector('[data-component="delete-chat-overlay"]');
        this.overlay?.addEventListener('click', this.props.onClose);
    }

    protected beforeUnmount(): void {
        if (this.infoButton?.element && this.infoEnter && this.infoLeave) {
            this.infoButton.element.removeEventListener('mouseenter', this.infoEnter);
            this.infoButton.element.removeEventListener('mouseleave', this.infoLeave);
        }
        if (this.deleteButton?.element && this.deleteEnter && this.deleteLeave) {
            this.deleteButton.element.removeEventListener('mouseenter', this.deleteEnter);
            this.deleteButton.element.removeEventListener('mouseleave', this.deleteLeave);
        }
        this.infoButton?.unmount();
        this.deleteButton?.unmount();
        this.overlay?.removeEventListener('click', this.props.onClose);
    }
}