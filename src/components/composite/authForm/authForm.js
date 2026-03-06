import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';
import { Checkbox } from "../../ui/checkbox/checkbox.js";


export class AuthForm extends BaseForm {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'auth';

        wrapper.innerHTML = `
            <form class="auth__form">
                <h1 class="auth__title">Вход</h1>

                <div class="auth__field">
                    <p class="auth__label"> Введите логин:</p>
                    <input 
                        class="ui-input"
                        type="email" 
                        name="email" 
                        placeholder="Email"
                        required
                    />
                </div>


                <div class="auth__field">
                    <p class="auth__label"> Введите пароль:</p>
                    <input
                        class="ui-input"
                        type="password" 
                        name="password" 
                        placeholder="Пароль"
                        required
                    />
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

        this.remember = new Checkbox({
            label: 'Запомнить меня',
            name: 'remember'
        });

        this.remember.mount(
            this.element.querySelector(".auth__remember")
        );

        this.loginButton = new Button({
            label: 'Войти',
        });

        this.loginButton.mount(
            this.element.querySelector('.auth__login')
        );

        this.registerButton = new Button({
            label: 'Зарегистрироваться',
            variant: 'secondary',
        });

        this.registerButton.mount(
            this.element.querySelector('.auth__register')
        );
    }
}