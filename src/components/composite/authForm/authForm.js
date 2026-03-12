import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';
import { Checkbox } from "../../ui/checkbox/checkbox.js";
import { authService } from '../../../services/authService.js';
import { Input } from '../../ui/input/input.js'; 
import { validationService } from '../../../services/validationService.js';

/**
 * Форма авторизации (логин + пароль). Валидирует ввод
 * и отправляет данные через AuthService.
 */
export class AuthForm extends BaseForm {
    /**
     * @param {object} [props={}] - Свойства.
     * @param {Function} [props.onNavigateToRegister] - Колбэк перехода на регистрацию.
     * @param {import Router} [props.router] - Роутер.
     */
    constructor(props = {}) {
        super(props);
        /** @type {string} Имя Handlebars-шаблона */
        this.tempName = "components/composite/authForm/authForm";
    }
    
    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        super.afterMount();

        this.loginInput = new Input({
            type: 'login',
            name: 'login',
            placeholder: 'Логин',
            required: true,
            class: 'ui-input',
            showErrorText : true,
        });

        this.loginInput.mount(
            this.element.querySelector("[data-component='loginInput']")
        );

        /** @type {HTMLElement|null} Элемент общей ошибки формы */
        this.formErrorElement = this.element.querySelector('[data-component="form-error-message"]');
        if (this.formErrorElement) { 
            this.formErrorElement.className = 'auth__form-error-message';
        }
        
        /** @type {Input} Поле пароля */
        this.passwordInput = new Input({
            class: 'ui-input',
            type: 'password',
            name: 'password',
            placeholder: 'Пароль',
            required: true,
            togglePassword: true,
            showErrorText : true,
        });

        this.passwordInput.mount(
            this.element.querySelector("[data-component='passwordInput']")
        );

        /** @type {Checkbox} Чекбокс «Запомнить меня» */
        this.remember = new Checkbox({
            label: 'Запомнить меня',
            name: 'remember'
        });

        this.remember.mount(
            this.element.querySelector(".auth__remember")
        );

        /** @type {Button} Кнопка «Войти» (submit) */
        this.loginButton = new Button({
            label: 'Войти',
            class: 'ui-button ui-button__primary',
            type: "submit",
        });

        this.loginButton.mount(
            this.element.querySelector('.auth__login')
        );

        /** @type {Button} Кнопка перехода к регистрации */
        this.registerButton = new Button({
            label: 'Зарегистрироваться',
            class: 'ui-button ui-button__secondary',
            type: "button",
            onClick: this.props.onNavigateToRegister, 
        });

        this.registerButton.mount(
            this.element.querySelector('.auth__register')
        );
    };


    /**
     * Размонтирует все дочерние компоненты.
     */
    beforeUnmount() {
        super.beforeUnmount();

        this.loginInput.unmount();
        this.passwordInput.unmount();
        this.remember.unmount();
        this.loginButton.unmount();
        this.registerButton.unmount();
    }


    /**
     * Показывает общую ошибку формы (например, «Неверный логин или пароль»).
     * @param {string} message - Текст ошибки.
     */
    showFormError(message) { 
        if (this.formErrorElement) {
            this.formErrorElement.textContent = message;
            this.formErrorElement.style.opacity = '1';
        }
    }

    /**
     * Скрывает общую ошибку формы.
     */
    clearFormError() {
        if (this.formErrorElement) {
            this.formErrorElement.textContent = '';
            this.formErrorElement.style.opacity = '0';
        }
    }

    /**
     * Валидирует данные и отправляет запрос на вход.
     * При успехе — переход на `/chats`, при ошибке — показ сообщения.
     *
     * @param {{login: string, password: string}} data - Данные формы.
     * @returns {Promise<void>}     */
    async onSubmit(data) {
        this.loginInput.clearError();
        this.passwordInput.clearError();
        this.clearFormError();
        this.loginButton.disabled = false; 


        const loginResult = validationService.validateLogin(data.login);
        const passwordResult = validationService.validateRequired(data.password, 'Пароль');

        let isFormValid = true;

        if (!loginResult.isValid) {
            this.loginInput.setError(loginResult.message);
            isFormValid = false;
            this.loginButton.disabled = true;
        }

        if (!passwordResult.isValid) {
            this.passwordInput.setError(passwordResult.message);
            this.loginButton.disabled = true;
            isFormValid = false;
        }

        if (!isFormValid) {
            throw new Error("Ошибка в форме, отправка данных отменена");
        }

        const result = await authService.login(data.login, data.password);

        if (result.success) {
            this.props.router.navigate('/chats');
        } else {
            this.loginInput.setError(' '); 
            this.passwordInput.setError(' '); 
            this.showFormError('Неверный логин или пароль');
            this.loginButton.disabled = true; 
            throw new Error(result.error || "Ошибка входа");
        }
    }
}
