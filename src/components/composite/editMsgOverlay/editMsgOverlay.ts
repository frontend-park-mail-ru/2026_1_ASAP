import { IBaseComponentProps, BaseComponent } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from "./editMsgOverlay.hbs"

interface EditMsgOverlayProps extends IBaseComponentProps {
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
};

export class EditMsgOverlay extends BaseComponent<EditMsgOverlayProps> {
    private editButton: Button | null = null;
    private deleteButton: Button | null = null;
    private overlay: HTMLElement | null = null;
    private handleOverlayClick = () => this.props.onClose();

    constructor(props: EditMsgOverlayProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.overlay = this.element!.querySelector('.edit-msg-overlay__overlay');
        this.overlay?.addEventListener('click', this.handleOverlayClick);

        const buttonsContainer = this.element!.querySelector('.edit-msg-overlay__buttons-container');
        this.editButton = new Button({
            label: "Изменить сообщение",
            icon: "/assets/images/icons/editMsgOverlayIcons/edit.svg",
            class: "edit-msg-overlay__buttons-container-edit-button",
            onClick: () => this.props.onEdit(),
        });
        this.editButton.mount(buttonsContainer as HTMLElement);

        this.deleteButton = new Button({
            label: "Удалить сообщение",
            icon: "/assets/images/icons/editMsgOverlayIcons/delete.svg",
            class: "edit-msg-overlay__buttons-container-delete-button",
            onClick: () => this.props.onDelete(),
        });
        this.deleteButton.mount(buttonsContainer as HTMLElement);
    };

    protected beforeUnmount(): void {
        this.overlay?.removeEventListener('click', this.handleOverlayClick);
        this.editButton?.unmount();
        this.deleteButton?.unmount();
    };
};