import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';
import { Checkbox } from "../../ui/checkbox/checkbox.js";
import { authService } from '../../../services/authService.js';
import { Input } from '../../ui/input/input.js'; 
import { validationService } from '../../../services/validationService.js';

export class AuthForm extends BaseForm {
    constructor(props = {}) {
        super(props);
        this.tempName = "components/composite/authForm/authForm";
    }
    
    afterMount() {
        super.afterMount();

        this.loginInput = new Input({
            type: 'login',
            name: 'login',
            placeholder: 'Логин',
            required: true,
            class: 'ui-input',
        });

        this.loginInput.mount(
            this.element.querySelector("[data-component='loginInput']")
        );

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
            togglePassword: true 
        });

        this.passwordInput.mount(
            this.element.querySelector("[data-component='passwordInput']")
        );

        this.remember = new Checkbox({
            label: 'Запомнить меня',
            name: 'remember'
        });

        this.remember.mount(
            this.element.querySelector(".auth__remember")
        );

        this.loginButton = new Button({
            label: 'Войти',
            class: 'ui-button ui-button__primary',
            type: "submit",
        });

        this.loginButton.mount(
            this.element.querySelector('.auth__login')
        );

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


    beforeUnmount() {
        super.beforeUnmount();

        this.loginInput.unmount();
        this.passwordInput.unmount();
        this.remember.unmount();
        this.loginButton.unmount();
        this.registerButton.unmount();
    }


    showFormError(message) { 
        if (this.formErrorElement) {
            this.formErrorElement.textContent = message;
            this.formErrorElement.style.opacity = '1';
        }
    }

    clearFormError() {
        if (this.formErrorElement) {
            this.formErrorElement.textContent = '';
            this.formErrorElement.style.opacity = '0';
        }
    }

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
            console.log('Форма невалидна, отправка отменена.');
            return;
        }
        console.log('Форма валидна. Отправка данных для входа:', data);


        const result = await authService.login(data.login, data.password);
        console.log('Результат входа:', result);

        if (result.success) {
            console.log('Успешный вход:', result.data);
            this.props.router.navigate('/chats');
        } else {
            console.log('Неверный логин или пароль:', result.error);
            this.loginInput.setError(' '); 
            this.passwordInput.setError(' '); 
            this.showFormError('Неверный логин или пароль');
            this.loginButton.disabled = true; 
        }
    }
}
