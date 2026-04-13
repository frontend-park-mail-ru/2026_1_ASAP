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
 * @class AuthForm
 * @extends BaseForm
 * @description Компонент формы авторизации. Управляет вводом данных,
 * валидацией и процессом входа пользователя в систему.
 *
 * @property {Input | null} loginInput - Поле ввода логина.
 * @property {Input | null} passwordInput - Поле ввода пароля.
 * @property {Checkbox | null} remember - Чекбокс "Запомнить меня".
 * @property {Button | null} loginButton - Кнопка для отправки формы и входа.
 * @property {Button | null} registerButton - Кнопка для перехода на страницу регистрации.
 * @property {HTMLElement | null} formErrorElement - Элемент для отображения общих ошибок формы.
 */
export class AuthForm extends BaseForm<AuthFormProps> {
    private loginInput: Input | null = null;
    private passwordInput: Input | null = null;
    private remember: Checkbox | null = null;
    private loginButton: Button | null = null;
    private registerButton: Button | null = null;
    private formErrorElement: HTMLElement | null = null;

    /**
     * @constructor
     * @param {AuthFormProps} props - Свойства для компонента формы авторизации.
     */
    constructor(props: AuthFormProps) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    /**
     * Выполняется после монтирования компонента в DOM.
     * Инициализирует дочерние компоненты (поля ввода, кнопки) и находит элемент для ошибок.
     */
    protected afterMount(): void {
        super.afterMount();
        if (!this.element) return;

        this.loginInput = new Input({ 
            type: 'text', 
            name: 'login', 
            placeholder: 'Логин', 
            required: true, 
            class: 'ui-input', 
            showErrorText: true,
            autocomplete: 'username',
            value: localStorage.getItem('saved_login') || ''
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
            showErrorText: true,
            autocomplete: 'current-password'
        });
        this.passwordInput.mount(this.element.querySelector("[data-component='passwordInput']") as HTMLElement);

        const savedLogin = localStorage.getItem('saved_login');
        this.remember = new Checkbox({ 
            label: 'Запомнить меня', 
            name: 'remember',
            checked: !!savedLogin
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

        const onInputChange = () => {
            this.clearFormError();
            if (this.loginButton) {
                this.loginButton.disabled = false;
            }
        };

        this.element.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', onInputChange);
        });
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает ресурсы, удаляя дочерние компоненты.
     */
    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.loginInput?.unmount();
        this.passwordInput?.unmount();
        this.remember?.unmount();
        this.loginButton?.unmount();
        this.registerButton?.unmount();
    }

    /**
     * Отображает сообщение об ошибке для всей формы.
     * @param {string} message - Текст ошибки для отображения.
     */
    public showFormError(message: string): void {
        if (this.formErrorElement) {
            this.formErrorElement.textContent = message;
            this.formErrorElement.style.opacity = '1';
        }
    }

    /**
     * Скрывает и очищает сообщение об ошибке формы.
     */
    public clearFormError(): void {
        if (this.formErrorElement) {
            this.formErrorElement.textContent = '';
            this.formErrorElement.style.opacity = '0';
        }
    }

    /**
     * Обрабатывает отправку формы.
     * Выполняет валидацию полей, и в случае успеха,
     * вызывает сервис авторизации для входа пользователя.
     * В случае неудачи - отображает соответствующие ошибки.
     * @param {object} data - Данные формы, собранные автоматически.
     * @param {string} [data.login] - Значение из поля "логин".
     * @param {string} [data.password] - Значение из поля "пароль".
     * @returns {Promise<void>}
     * @protected
     */
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
            if (this.remember?.value) {
                localStorage.setItem('saved_login', data.login!);
            } else {
                localStorage.removeItem('saved_login');
            }
            this.props.router.navigate('/chats');
        } else {
            this.loginInput.setError(' ');
            this.passwordInput.setError(' ');
            this.showFormError('Неверный логин или пароль');
            this.loginButton.disabled = true;
        }
    }
}