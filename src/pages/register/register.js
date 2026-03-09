import { BasePage } from '../../core/base/basePage.js';
import { RegisterForm } from '../../components/composite/registerForm/registerForm.js';

export class RegisterPage extends BasePage {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'login-page'; 

        wrapper.innerHTML = `
            <img class="auth__logo" src="/assets/images/icons/Logo.svg" alt="Логотип" />
            <div class="login-page__glow"></div>
            <div class="ui-card register-card"></div>
        `;
        return wrapper;
    }

    afterMount() {
        this.form = new RegisterForm({
            onNavigateToLogin: () => {
                this.props.router.navigate('/login');
            },
            router: this.props.router
        });

        this.form.mount(
            this.element.querySelector('.register-card')
        );
    }

    beforeUnmount() {
        this.form.unmount();
    }
}