import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';
import { authService } from '../../../services/authService.js';
import { Input } from '../../ui/input/input.js'; 
import { validationService } from '../../../services/validationService.js';

export class RegisterForm extends BaseForm {
    constructor(props = {}) {
        super(props);
        this.tempName = "components/composite/registerForm/registerForm";
    }

    afterMount() {
        super.afterMount();

        const backArrow = this.element.querySelector('.auth__backArrow');
        if (backArrow) {
            backArrow.addEventListener('click', this.props.onNavigateToLogin);
        }   
        
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

        this.emailInput = new Input({
            class: 'ui-input',
            name: 'email',
            type: 'email',
            placeholder: 'Почта',
            required: true,
            showErrorText : true,
        });
        this.emailInput.mount(
            this.element.querySelector('[data-component="email-input"]')
        );

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

        this.registerButton = new Button({
            label: 'Зарегистрироваться',
            class: 'ui-button ui-button__primary',
            type: "submit",
        });
        this.registerButton.mount(
            this.element.querySelector('.auth__register')
        );
    }

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

        if (!isFormValid) {
            console.log('Форма невалидна, отправка отменена.');
            return;
        }

        console.log('Форма регистрации валидна. Отправка данных:', data);
        const result = await authService.register(data.email, data.login, data.password);

        if (result.success) {
            console.log('Успешная регистрация:', result.data);
            this.props.router.navigate('/chats');
        } else {
            console.log('Ошибка регистрации:', result);
            if (result.error.includes("409")) {
                this.emailInput.setError('Пользователь с такой почтой или логином уже существует');
                this.loginInput.setError('Пользователь с таким логином уже существует');
            }
        }
    }
}