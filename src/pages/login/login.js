import { BasePage } from '../../core/base/basePage.js';
import { AuthForm } from '../../components/composite/authForm/authForm.js';


export class LoginPage extends BasePage {
    constructor (props = {}) {
        super(props);
        this.tempPath = "/pages/login/login.hbs";
    }

    async afterMount() {
        await super.afterMount();
        
        this.form = new AuthForm({
            onNavigateToRegister: () => {
                this.props.router.navigate('/register');
            },
            router: this.props.router
        });

        await this.form.mount(
            this.element.querySelector('.login-card')
        );
    };

    async beforeUnmount() {
        await this.form.unmount();
    };
};