import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import { Input } from "../../ui/input/input";
import template from "./editProfileOverlay.hbs";

interface EditProfileOverlayProps extends IBaseComponentProps {
    fieldKey: "login" | "email" | "birthDate" | "bio";
    value?: string;
    inputType: "text" | "email" | "date" | "textarea";
    onSave: (newValue: string) => void;
    onClose: () => void;
};

export class EditProfileOverlay extends BaseComponent<EditProfileOverlayProps> {
    private saveButton: Button | null = null;
    private editInput: Input | null = null;
    private overlay: HTMLElement | null = null;

    constructor(props: EditProfileOverlayProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.editInput = new Input({
            value: this.props.value,
            type: this.props.inputType,
            class: "edit-profile__edit-input",
            name: "edit-field"
        });
        this.editInput.mount(this.element!.querySelector('.edit-profile__edit-container'));

        this.saveButton = new Button({
            type: "button",
            onClick: () => {
                this.props.onSave(this.editInput?.value);
                },
            class: "save-field-button",
            label: "Сохранить",
        });
        this.saveButton.mount(this.element!.querySelector('.edit-profile__edit-container'));

        this.overlay = this.element!.querySelector('.edit-profile__overlay');
        this.overlay.addEventListener("click", this.props.onClose);
    };

    protected beforeUnmount(): void {
        this.editInput?.unmount();
        this.saveButton?.unmount();
        this.overlay.removeEventListener("click", this.props.onClose);
    };
};