import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm';
import { Button } from '../../ui/button/button';
import { authService } from '../../../services/authService';
import { Input } from '../../ui/input/input';
import { validationService } from '../../../services/validationService';
import { Router } from '../../../core/router';
import template from "./registerForm.hbs";

/**
 * @interface RegisterFormProps - Свойства для формы регистрации.
 * @property {Function} onNavigateToLogin - Колбэк для перехода на страницу входа.
 * @property {Router} router - Экземпляр роутера.
 */
interface RegisterFormProps extends IBaseFormProps {
    onNavigateToLogin: () => void;
    router: Router;
}

/**
 * Форма регистрации. Валидирует ввод и отправляет данные через AuthService.
 */
export class RegisterForm extends BaseForm<RegisterFormProps> {
    private loginInput: Input | null = null;
    private emailInput: Input | null = null;
    private passwordInput: Input | null = null;
    private registerButton: Button | null = null;

    constructor(props: RegisterFormProps) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();
        if (!this.element) return;

        const backArrow = this.element.querySelector('.auth__backArrow');
        backArrow?.addEventListener('click', this.props.onNavigateToLogin);

        this.loginInput = new Input({ 
            class: 'ui-input', 
            name: 'login', 
            placeholder: 'Логин', 
            required: true, 
            showErrorText: true 
        });
        this.loginInput.mount(this.element.querySelector('[data-component="login-input"]') as HTMLElement);

        this.emailInput = new Input({ 
            class: 'ui-input', 
            name: 'email', 
            type: 'text', 
            placeholder: 'Почта', 
            required: true, 
            showErrorText: true });
        this.emailInput.mount(this.element.querySelector('[data-component="email-input"]') as HTMLElement);

        this.passwordInput = new Input({ 
            class: 'ui-input', 
            name: 'password', 
            type: 'password', 
            placeholder: 'Пароль', 
            required: true, 
            togglePassword: true, 
            showErrorText: true });
        this.passwordInput.mount(this.element.querySelector('[data-component="password-input"]') as HTMLElement);

        this.registerButton = new Button({ 
            label: 'Зарегистрироваться', 
            class: 'ui-button ui-button__primary', 
            type: "submit" 
        });
        this.registerButton.mount(this.element.querySelector('.auth__register') as HTMLElement);

        const onInputChange = () => {
            if (this.registerButton) {
                this.registerButton.disabled = false;
            }
        };

        this.element.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', onInputChange);
        });
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        const backArrow = this.element?.querySelector('.auth__backArrow');
        if (backArrow) {
            backArrow.removeEventListener('click', this.props.onNavigateToLogin);
        }
        this.loginInput?.unmount();
        this.emailInput?.unmount();
        this.passwordInput?.unmount();
        this.registerButton?.unmount();
    }

    protected async onSubmit(data: { login?: string; email?: string; password?: string; }): Promise<void> {
        if (!this.loginInput || !this.emailInput || !this.passwordInput) return;

        this.loginInput.clearError();
        this.emailInput.clearError();
        this.passwordInput.clearError();
        this.registerButton.disabled = false;

        const loginResult = validationService.validateLogin(data.login || '');
        const emailResult = validationService.validateEmail(data.email || '');
        const passwordResult = validationService.validatePassword(data.password || '');
        let isFormValid = true;

        if (!loginResult.isValid) {
            this.loginInput.setError(loginResult.message);
            isFormValid = false;
        }
        if (!emailResult.isValid) {
            this.emailInput.setError(emailResult.message);
            isFormValid = false;
        }
        if (!passwordResult.isValid) {
            this.passwordInput.setError(`${passwordResult.missing?.join('; ')}`);
            isFormValid = false;
        }

        if (!isFormValid) {
            this.registerButton.disabled = true;
            return;
        }

        const result = await authService.register(data.email!, data.login!, data.password!);
        if (result.success) {
            this.props.router.navigate('/chats');
        } else {
            this.registerButton.disabled = true;
            if (result.error?.includes("Login already register")) {
                this.loginInput.setError("Пользователь с таким логином уже существует");
            } else if (result.error?.includes("Email already register")) {
                this.emailInput.setError("Пользователь с такой почтой уже существует");
            } else if (result.error) {
                this.loginInput.setError(result.error);
            }
        }
    }
}