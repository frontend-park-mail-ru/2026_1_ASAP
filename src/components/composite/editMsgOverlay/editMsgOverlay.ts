import { IBaseComponentProps, BaseComponent } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from "./editMsgOverlay.hbs"

interface EditMsgOverlayProps extends IBaseComponentProps {
    anchorRect: DOMRect;
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

        const buttonsContainer = this.element!.querySelector<HTMLElement>('.edit-msg-overlay__buttons-container');
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

        if (buttonsContainer) {
            requestAnimationFrame(() => this.positionPanel(buttonsContainer));
        }
    };

    private positionPanel(panel: HTMLElement): void {
        const { anchorRect } = this.props;
        const margin = 8;
        const w = panel.offsetWidth || 220;
        const h = panel.offsetHeight || 100;

        let left = anchorRect.right - w;
        let top = anchorRect.top - h - margin;

        if (top < margin) {
            top = anchorRect.bottom + margin;
        }
        if (top + h > window.innerHeight - margin) {
            top = window.innerHeight - h - margin;
        }
        left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
        top = Math.max(margin, top);

        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
    }

    protected beforeUnmount(): void {
        this.overlay?.removeEventListener('click', this.handleOverlayClick);
        this.editButton?.unmount();
        this.deleteButton?.unmount();
    };
};