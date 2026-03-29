import { BasePage, IBasePageProps } from '../../core/base/basePage';
import { AuthForm } from '../../components/composite/authForm/authForm';
import template from "./login.hbs";

/**
 * @interface LoginPageProps - Свойства для страницы входа.
 */
interface LoginPageProps extends IBasePageProps {}

/**
 * Страница входа. Отображает форму авторизации.
 */
export class LoginPage extends BasePage<LoginPageProps> {
    private form: AuthForm | null = null;

    constructor(props: LoginPageProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected async afterMount(): Promise<void> {
        const loginCard = this.element?.querySelector('.login-card');
        if (!loginCard) {
            console.error("LoginPage: .login-card container not found.");
            return;
        }

        this.form = new AuthForm({
            onNavigateToRegister: () => {
                this.props.router?.navigate('/register');
            },
            router: this.props.router
        });
        this.form.mount(loginCard as HTMLElement);
    }

    public beforeUnmount(): void {
        this.form?.unmount();
    }
}