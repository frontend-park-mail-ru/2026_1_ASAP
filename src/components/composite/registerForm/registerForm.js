import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';

export class RegisterForm extends BaseForm {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'auth';
        wrapper.innerHTML = `
            <form class="auth__form">
                <h1 class="auth__title">Регистрация</h1>
                <div class="auth__inputs">
                    <div class="auth__field">
                        <p class="auth__label">Введите логин:</p>
                        <input class="ui-input" type="text" name="login" placeholder="Логин" required />
                    </div>
                    <div class="auth__field">
                        <p class="auth__label">Введите почту:</p>
                        <input class="ui-input" type="email" name="email" placeholder="Почта" required />
                    </div>
                    <div class="auth__field">
                        <p class="auth__label">Пароль:</p>
                        <input class="ui-input" type="password" name="password" placeholder="Пароль" required />
                    </div>
                </div>
                <div class="auth__register"></div>
            </form>
        `;

        return wrapper;
    }

    afterMount() {
        super.afterMount();

        this.registerButton = new Button({
            label: 'Зарегистрироваться',
            class: 'ui-button ui-button__primary',
            type: "submit",
        });
        this.registerButton.mount(
            this.element.querySelector('.auth__register')
        );
    }
    
    onSubmit(data) {
        console.log('Данные для регистрации:', data);
        // TODO: Валидация данных и отображение ошибок
        // TODO: Отправить данные на сервер
        this.props.router.navigate('/login');
    }
}