import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm';
import { Button } from '../../ui/button/button';
import { Checkbox } from "../../ui/checkbox/checkbox";
import { authService } from '../../../services/authService';
import { Input } from '../../ui/input/input';
import { validationService } from '../../../services/validationService';
import { Router } from '../../../core/router';
import template from './authForm.hbs';

/**
 * @interface AuthFormProps - Свойства для формы авторизации.
 * @property {Function} onNavigateToRegister - Колбэк для перехода на страницу регистрации.
 * @property {Router} router - Экземпляр роутера.
 */
interface AuthFormProps extends IBaseFormProps {
    onNavigateToRegister: () => void;
    router: Router;
}

/**
 * Форма авторизации. Валидирует ввод и отправляет данные через AuthService.
 */
export class AuthForm extends BaseForm<AuthFormProps> {
    private loginInput: Input | null = null;
    private passwordInput: Input | null = null;
    private remember: Checkbox | null = null;
    private loginButton: Button | null = null;
    private registerButton: Button | null = null;
    private formErrorElement: HTMLElement | null = null;

    constructor(props: AuthFormProps) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();
        if (!this.element) return;

        this.loginInput = new Input({ 
            type: 'login', 
            name: 'login', 
            placeholder: 'Логин', 
            required: true, 
            class: 'ui-input', 
            showErrorText: true 
        });
        this.loginInput.mount(this.element.querySelector("[data-component='loginInput']") as HTMLElement);

        this.formErrorElement = this.element.querySelector('[data-component="form-error-message"]');
        if (this.formErrorElement) {
            this.formErrorElement.className = 'auth__form-error-message';
        }

        this.passwordInput = new Input({ 
            class: 'ui-input', 
            type: 'password', 
            name: 'password', 
            placeholder: 'Пароль', 
            required: true, 
            togglePassword: true, 
            showErrorText: true 
        });
        this.passwordInput.mount(this.element.querySelector("[data-component='passwordInput']") as HTMLElement);

        this.remember = new Checkbox({ 
            label: 'Запомнить меня', 
            name: 'remember' 
        });
        this.remember.mount(this.element.querySelector(".auth__remember") as HTMLElement);

        this.loginButton = new Button({ 
            label: 'Войти', 
            class: 'ui-button ui-button__primary', 
            type: "submit" });
        this.loginButton.mount(this.element.querySelector('.auth__login') as HTMLElement);

        this.registerButton = new Button({ 
            label: 'Зарегистрироваться', 
            class: 'ui-button ui-button__secondary', 
            type: "button", 
            onClick: this.props.onNavigateToRegister });
        this.registerButton.mount(this.element.querySelector('.auth__register') as HTMLElement);
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.loginInput?.unmount();
        this.passwordInput?.unmount();
        this.remember?.unmount();
        this.loginButton?.unmount();
        this.registerButton?.unmount();
    }

    public showFormError(message: string): void {
        if (this.formErrorElement) {
            this.formErrorElement.textContent = message;
            this.formErrorElement.style.opacity = '1';
        }
    }

    public clearFormError(): void {
        if (this.formErrorElement) {
            this.formErrorElement.textContent = '';
            this.formErrorElement.style.opacity = '0';
        }
    }

    protected async onSubmit(data: { login?: string; password?: string; }): Promise<void> {
        if (!this.loginInput || !this.passwordInput || !this.loginButton) return;

        this.loginInput.clearError();
        this.passwordInput.clearError();
        this.clearFormError();
        this.loginButton.disabled = false;

        const loginResult = validationService.validateLogin(data.login || '');
        const passwordResult = validationService.validateRequired(data.password || '', 'Пароль');
        let isFormValid = true;

        if (!loginResult.isValid) {
            this.loginInput.setError(loginResult.message);
            isFormValid = false;
        }

        if (!passwordResult.isValid) {
            this.passwordInput.setError(passwordResult.message);
            isFormValid = false;
        }
        
        if (!isFormValid) {
            this.loginButton.disabled = true;
            return;
        }

        const result = await authService.login(data.login!, data.password!);
        if (result.success) {
            this.props.router.navigate('/chats');
        } else {
            this.loginInput.setError(' ');
            this.passwordInput.setError(' ');
            this.showFormError('Неверный логин или пароль');
            this.loginButton.disabled = true;
        }
    }
}