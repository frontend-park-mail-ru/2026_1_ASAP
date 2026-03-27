import { BaseForm } from '../../../core/base/baseForm';
import { Button } from '../../ui/button/button';
import { authService } from '../../../services/authService';
import { Input } from '../../ui/input/input'; 
import { validationService } from '../../../services/validationService';
import template from "./registerForm.hbs";

/**
 * Форма регистрации (логин + email + пароль). Валидирует ввод
 * и отправляет данные через AuthService.
 */
export class RegisterForm extends BaseForm {
    /**
     * @param {object} [props={}] - Свойства.
     * @param {Function} [props.onNavigateToLogin] - Колбэк перехода на страницу входа.
     * @param {import Router} [props.router] - Роутер.
     */
    constructor(props = {}) {
        super(props);
    };

    getTemplate() {
        return template;
    };
    
    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        super.afterMount();

        const backArrow = this.element.querySelector('.auth__backArrow');
        if (backArrow) {
            backArrow.addEventListener('click', this.props.onNavigateToLogin);
        }   
        
        /** @type {Input} Поле пароля */
        this.loginInput = new Input({
            class: 'ui-input',
            name: 'login',
            placeholder: 'Логин',
            required: true,
            showErrorText : true,
        });
        this.loginInput.mount(
            this.element.querySelector('[data-component="login-input"]')
        );

        /** @type {Input} Поле почты */
        this.emailInput = new Input({
            class: 'ui-input',
            name: 'email',
            type: 'text',
            placeholder: 'Почта',
            required: true,
            showErrorText : true,
        });
        this.emailInput.mount(
            this.element.querySelector('[data-component="email-input"]')
        );

        /** @type {Input} Поле пароля */
        this.passwordInput = new Input({
            class: 'ui-input',
            name: 'password',
            type: 'password',
            placeholder: 'Пароль',
            required: true,
            togglePassword: true,
            showErrorText : true,
        });
        this.passwordInput.mount(
            this.element.querySelector('[data-component="password-input"]')
        );

        /** @type {Button} Кнопка регистрации */
        this.registerButton = new Button({
            label: 'Зарегистрироваться',
            class: 'ui-button ui-button__primary',
            type: "submit",
        });
        this.registerButton.mount(
            this.element.querySelector('.auth__register')
        );
    }

    /**
     * Размонтирует все дочерние компоненты.
     */
    beforeUnmount() {
        super.beforeUnmount();
        const backArrow = this.element.querySelector('.auth__backArrow');
        if (backArrow) {
            backArrow.removeEventListener('click', this.props.onNavigateToLogin);
        }
        this.loginInput.unmount();
        this.emailInput.unmount();
        this.passwordInput.unmount();
        this.registerButton.unmount();
    }
    
    /**
     * Валидирует данные и отправляет запрос на регистрацию.
     * @param {{login: string, email: string, password: string}} data - Данные формы.
     * @returns {Promise<void>}
     */
    async onSubmit(data) {
        this.loginInput.clearError();
        this.emailInput.clearError();
        this.passwordInput.clearError();

        const loginResult = validationService.validateLogin(data.login);
        const emailResult = validationService.validateEmail(data.email);
        const passwordResult = validationService.validatePassword(data.password);

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
            this.passwordInput.setError(`Не хватает: ${passwordResult.missing.join(', ')}`);
            isFormValid = false;
        }

        if (isFormValid) {
            const result = await authService.register(data.email, data.login, data.password);

            if (result.success) {
                this.props.router.navigate('/chats');
                
            } else if (result.error == "Login already register") {
                this.loginInput.setError("Пользователь с таким логином уже существует");
            } else if (result.error == "Email already register") {
                this.emailInput.setError("Пользователь с такой почтой уже существует");
            }
        }
    }
}