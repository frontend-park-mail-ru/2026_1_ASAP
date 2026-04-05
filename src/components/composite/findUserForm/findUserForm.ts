import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Input } from "../../ui/input/input";
import { Button } from "../../ui/button/button";
import template from "./findUserForm.hbs";
import { validationService } from "../../../services/validationService";

interface FindUserFormProps extends IBaseFormProps {
    onSubmitForm: (login: string) => void;
}

export class FindUserForm extends BaseForm<FindUserFormProps> {
    private loginInput: Input | null = null;
    private submitButton: Button | null = null;

    constructor(props: FindUserFormProps) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();
        if (!this.element) return;

        const label = "Введите логин:";
        this.element.querySelector('.find-user-form__label')!.textContent = label;

        const inputSlot = this.element.querySelector('[data-component="find-user-input-slot"]');
        this.loginInput = new Input({
            type: "text",
            name: "login",
            placeholder: "Pavel",
            class: "ui-input-secondary find-user-input"
        });
        this.loginInput.mount(inputSlot as HTMLElement);

        const buttonSlot = this.element.querySelector('[data-component="find-user-submit-slot"]');
        this.submitButton = new Button({
            label: "Написать",
            type: "submit",
            class: "ui-button__secondary3 find-user-submit-btn"
        });
        this.submitButton.mount(buttonSlot as HTMLElement);
    }

    protected async onSubmit(data: { [key: string]: string }): Promise<void> {
        const login = data['login'];
        
        const loginValidation = validationService.validateLogin(login);
        if (!loginValidation.isValid) {
            this.loginInput?.setError(loginValidation.message);
            return;
        }

        this.loginInput?.clearError();
        this.props.onSubmitForm(login);
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.loginInput?.unmount();
        this.submitButton?.unmount();
    }
}