import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Input } from "../../ui/input/input";
import { Button } from "../../ui/button/button";
import template from "./findUserForm.hbs";
import { validationService } from "../../../services/validationService";

interface FindUserFormProps extends IBaseFormProps {
    onSubmitForm: (login: string) => Promise<string | void> | void;
    labelButton?: string;
    labelInput?: string;
    labelTitle?: string;
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

        const title = this.props.labelTitle ? this.props.labelTitle : "Написать пользователю";
        this.element.querySelector('.find-user-form__title')!.textContent = title;

        const label = this.props.labelInput ? this.props.labelInput : "Введите логин:";
        this.element.querySelector('.find-user-form__label')!.textContent = label;

        const inputSlot = this.element.querySelector('[data-component="find-user-input-slot"]');
        this.loginInput = new Input({
            type: "text",
            name: "login",
            placeholder: "Pavel",
            class: "ui-input-secondary find-user-input",
            showErrorText: true
        });
        this.loginInput.mount(inputSlot as HTMLElement);

        const buttonSlot = this.element.querySelector('[data-component="find-user-submit-slot"]');
        this.submitButton = new Button({
            label: this.props.labelButton ? this.props.labelButton : "Написать",
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
        
        const errorMessage = await this.props.onSubmitForm(login);
        if (typeof errorMessage === 'string') {
            this.loginInput?.setError(errorMessage);
        }
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.loginInput?.unmount();
        this.submitButton?.unmount();
    }
}