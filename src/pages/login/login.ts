import { BasePage, IBasePageProps } from '../../core/base/basePage';
import { AuthForm } from '../../components/composite/authForm/authForm';
import template from "./login.hbs";
import { PULSE_SUPPORT_CLOSE } from '../../core/constants/supportIframe';

/**
 * @interface LoginPageProps
 * @description Свойства для компонента страницы входа.
 * @extends IBasePageProps
 */
interface LoginPageProps extends IBasePageProps {}

/**
 * @class LoginPage
 * @extends BasePage
 * @description Компонент, представляющий собой страницу входа в приложение.
 * Основная задача - отобразить и управлять формой авторизации (`AuthForm`).
 *
 * @property {AuthForm | null} form - Экземпляр компонента формы авторизации.
 */
export class LoginPage extends BasePage<LoginPageProps> {
    private form: AuthForm | null = null;
    private supportMessageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== PULSE_SUPPORT_CLOSE) return;
        const iframe = this.element?.querySelector<HTMLIFrameElement>(".support-iframe");
        iframe?.classList.add("support-iframe--hidden");
    };

    constructor(props: LoginPageProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    /**
     * Выполняется после монтирования страницы в DOM.
     * Находит контейнер для формы и монтирует в него компонент `AuthForm`,
     * передавая ему необходимые колбэки и роутер.
     * @protected
     */
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
        window.addEventListener("message", this.supportMessageListener);
    }

    public beforeUnmount(): void {
        window.removeEventListener("message", this.supportMessageListener);
        this.form?.unmount();
    }
}