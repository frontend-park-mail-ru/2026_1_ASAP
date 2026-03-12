import { BasePage } from '../../core/base/basePage.js';
import { RegisterForm } from '../../components/composite/registerForm/registerForm.js';

export class RegisterPage extends BasePage {
    constructor(props = {}) {
        super(props);
        this.tempName = "pages/register/register";
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