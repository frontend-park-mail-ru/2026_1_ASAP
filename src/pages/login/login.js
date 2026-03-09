import { BasePage } from '../../core/base/basePage.js';
import { AuthForm } from '../../components/composite/authForm/authForm.js';


export class LoginPage extends BasePage {
    render() {

        const wrapper = document.createElement('div');

        wrapper.className = 'login-page';

        wrapper.innerHTML = `
            <img class="auth__logo" src="/assets/images/icons/logo.svg" alt="Логотип" />
            <div class="login-page__glow"></div>
            <div class="ui-card login-card"></div>
        `;
        return wrapper;
    }

    afterMount() {
        this.form = new AuthForm({
            onNavigateToRegister: () => {
                this.props.router.navigate('/register');
            },
            router: this.props.router
        });
        this.form.mount(
            this.element.querySelector('.login-card')
        );
    };

    beforeUnmount() {
        this.form.unmount();
    };
};