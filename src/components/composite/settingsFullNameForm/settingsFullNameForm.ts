import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Input } from "../../ui/input/input";
import template from "./settingsFullNameForm.hbs";

interface SettingsFullNameFormProps extends IBaseComponentProps {
    firstName: string;
    lastName: string;
    onChange?: (firstName: string, lastName: string) => void;
};

export class SettingsFullNameForm extends BaseComponent<SettingsFullNameFormProps> {
    private firstNameInput: Input | null = null;
    private lastNameInput: Input | null = null;
    private inputHandler: (() => void) | null = null;

    constructor(props: SettingsFullNameFormProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.firstNameInput = new Input({
            placeholder: "Имя",
            name: "settings-first-name",
            class: "settings-name-input",
            value: this.props.firstName,
        });
        this.firstNameInput.mount(this.element!);

        this.lastNameInput = new Input({
            placeholder: "Фамилия",
            name: "settings-last-name",
            class: "settings-name-input",
            value: this.props.lastName
        });
        this.lastNameInput.mount(this.element!);

        if (this.props.onChange) {
            this.inputHandler = () => {
                this.props.onChange?.(this.firstNameInput!.value, this.lastNameInput!.value);
            };
            this.element!.addEventListener("input", this.inputHandler);
        }
    };

    protected beforeUnmount(): void {
        if (this.inputHandler){
            this.element?.removeEventListener("input", this.inputHandler);
            this.inputHandler = null;
        }
        this.firstNameInput?.unmount();
        this.lastNameInput?.unmount();
    };
};