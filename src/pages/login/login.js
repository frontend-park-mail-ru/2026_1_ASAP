import { BasePage } from '../../core/base/basePage.js';
import { AuthForm } from '../../components/composite/authForm/authForm.js';


export class loginPage extends BasePage {
    afterMount() {
        this.form = new AuthForm()
        this.form.mount(this.root);
    };

    beforeUnmount() {
        this.form.unmount();
    };
};