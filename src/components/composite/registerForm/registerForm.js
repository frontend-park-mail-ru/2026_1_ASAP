import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';
import { authService } from '../../../services/authService.js';
import { Input } from '../../ui/input/input.js'; 

export class RegisterForm extends BaseForm {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'auth';
        wrapper.innerHTML = `
            <form class="auth__form">
                <div class="auth__header">
                    <div class="auth__backArrow">
                        <img class = "auth__backArrow" src="/assets/images/icons/backArrow.svg" alt="Назад" />
                    </div>
                    <h1 class="auth__title">Регистрация</h1>
                </div>
                <div class="auth__inputs">
                    <div class="auth__field">
                        <p class="auth__label">Введите логин:</p>
                        <div data-component="login-input"></div>
                    </div>
                    <div class="auth__field">
                        <p class="auth__label">Введите почту:</p>
                        <div data-component="email-input"></div>
                    </div>
                    <div class="auth__field">
                        <p class="auth__label">Пароль:</p>
                        <div data-component="password-input"></div>
                    </div>
                </div>
                <div class="auth__register"></div>
            </form>
        `;

        return wrapper;
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
            required: true
        });
        this.loginInput.mount(
            this.element.querySelector('[data-component="login-input"]')
        );

        this.emailInput = new Input({
            class: 'ui-input',
            name: 'email',
            type: 'email',
            placeholder: 'Почта',
            required: true
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
            togglePassword: true 
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
        this.passwordConfirmInput.unmount();
        this.registerButton.unmount();
        this.loginButton.unmount();
    }
    
    async onSubmit(data) {
        console.log('Данные для регистрации:', data);
        // todo валидация данных и отображение ошибок до отправки на сервер

        const result = await authService.register(data.email, data.login, data.password);
        if (result.success) {
            console.log('Успешная регистрация:', result.data);
            this.props.router.navigate('/login');
        } else {
            console.error('Ошибка регистрации:', result.error);
            // todo написать валидацию и показать ошибку пользователю
        }
    }
}