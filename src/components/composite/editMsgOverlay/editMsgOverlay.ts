import { IBaseComponentProps, BaseComponent } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from "./editMsgOverlay.hbs"

interface EditMsgOverlayProps extends IBaseComponentProps {
    onEdit: () => void;
    onDelete: () => void;
};

export class EditMsgOverlay extends BaseComponent<EditMsgOverlayProps> {
    private editButton: Button | null = null;
    private cancelButton: Button | null = null;

    constructor(props: EditMsgOverlayProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        const overlay = this.element!.querySelector('.edit-msg-overlay__overlay');
        const buttonsContainer = this.element!.querySelector('.edit-msg-overlay__buttons-container');
        this.editButton = new Button({
            title: "Изменить",
        });
        this.editButton.mount(buttonsContainer as HTMLElement);

        this.cancelButton = new Button({
            title: "Удалить",
        });
        this.cancelButton.mount(buttonsContainer as HTMLElement);
    };

    protected beforeUnmount(): void {
        this.editButton?.unmount();
        this.cancelButton?.unmount();
    };
};