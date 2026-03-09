import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';
import { Checkbox } from "../../ui/checkbox/checkbox.js";
import { authService } from '../../../services/authService.js';
import { Input } from '../../ui/input/input.js'; 

export class AuthForm extends BaseForm {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'auth';

        wrapper.innerHTML = `
            <form class="auth__form">
                <h1 class="auth__title">Вход</h1>
                <div class="auth__inputs">
                    <div class="auth__field">
                        <p class="auth__label"> Введите логин:</p>
                        <div data-component="loginInput"></div>
                    </div>

                    <div class="auth__field">
                        <p class="auth__label"> Введите пароль:</p>
                        <div data-component="passwordInput"></div>
                    </div>
                </div>
                <div class="auth__remember"></div>

                <div class="auth__login"></div>
                <div class="auth__divider">
                    <span class="auth__divider-text">Нет аккаунта?</span>
                </div>
                <div class="auth__register"></div>

            </form>
        `;

        return wrapper;
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

        this.emailInput.unmount();
        this.passwordInput.unmount();
        this.remember.unmount();
        this.loginButton.unmount();
        this.registerButton.unmount();
    }


    async onSubmit(data) {
        console.log('Данные для входа:', data);
        // const rememberMe = this.remember.value; пока некуда передавать

        // todo валидация данных и отображение ошибок до отправки на сервер
        const result = await authService.login(data.login, data.password);
        console.log('Результат входа:', result);

        if (result.success) {
            console.log('Успешный вход:', result.data);
            this.props.router.navigate('/chats');
        } else {
            console.error('Ошибка входа:', result.error);
            // todo написать валидацию и показать ошибку пользователю

        }
    }
}
