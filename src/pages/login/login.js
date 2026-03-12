import { BasePage } from '../../core/base/basePage.js';
import { AuthForm } from '../../components/composite/authForm/authForm.js';


export class LoginPage extends BasePage {
    constructor (props = {}) {
        super(props);
        this.tempName = "pages/login/login";
    }

    afterMount() {
        super.afterMount();
        
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
        this.form?.unmount();
    };
};