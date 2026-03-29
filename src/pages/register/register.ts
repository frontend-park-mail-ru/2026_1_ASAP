import { BasePage, IBasePageProps } from '../../core/base/basePage';
import { RegisterForm } from '../../components/composite/registerForm/registerForm';
import template from "./register.hbs";

/**
 * @interface RegisterPageProps - Свойства для страницы регистрации.
 */
interface RegisterPageProps extends IBasePageProps {}

/**
 * Страница регистрации. Отображает форму регистрации.
 */
export class RegisterPage extends BasePage<RegisterPageProps> {
    private form: RegisterForm | null = null;

    constructor(props: RegisterPageProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected async afterMount(): Promise<void> {
        const registerCard = this.element?.querySelector('.register-card');
        if (!registerCard) {
            console.error("RegisterPage: .register-card container not found.");
            return;
        }

        this.form = new RegisterForm({
            onNavigateToLogin: () => {
                this.props.router?.navigate('/login');
            },
            router: this.props.router
        });
        this.form.mount(registerCard as HTMLElement);
    }

    public beforeUnmount(): void {
        this.form?.unmount();
    }
}