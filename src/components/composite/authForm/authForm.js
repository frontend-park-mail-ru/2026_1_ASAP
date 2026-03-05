import { BaseForm } from '../../../core/base/baseForm.js';
import { Button } from '../../ui/button/button.js';

export class AuthForm extends BaseForm {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'auth';

        wrapper.innerHTML = `
            <form class="auth__form">
                <h1 class="auth__title">Вход</h1>

                <div class="auth__field">
                    <input 
                        type="email" 
                        name="email" 
                        placeholder="Email"
                        required
                    />
                </div>

                <div class="auth__field">
                    <input 
                        type="password" 
                        name="password" 
                        placeholder="Пароль"
                        required
                    />
                </div>

                <div class="auth-button"></div>
            </form>
        `;

        return wrapper;
    }

    afterMount() {
        this.button = new Button({
            label: 'Войти',
        });

        this.button.mount(
            this.element.querySelector('.auth-button')
        );
    }
}