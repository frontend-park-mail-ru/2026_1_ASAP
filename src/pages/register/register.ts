import { BasePage, IBasePageProps } from '../../core/base/basePage';
import { RegisterForm } from '../../components/composite/registerForm/registerForm';
import template from "./register.hbs";
import { SupportFrame } from '../../components/composite/supportFrame/supportFrame';
import { Button } from '../../components/ui/button/button';

/**
 * @interface RegisterPageProps - Свойства для страницы регистрации.
 */
interface RegisterPageProps extends IBasePageProps {}

/**
 * @class RegisterPage
 * @extends BasePage
 * @description Компонент, представляющий собой страницу регистрации нового пользователя.
 * Отображает и управляет формой регистрации (`RegisterForm`).
 *
 * @property {RegisterForm | null} form - Экземпляр компонента формы регистрации.
 */
export class RegisterPage extends BasePage<RegisterPageProps> {
    private form: RegisterForm | null = null;
    private supportButton: Button | null = null;
    private supportFrame: SupportFrame | null = null;

    constructor(props: RegisterPageProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    /**
     * Выполняется после монтирования страницы в DOM.
     * Находит контейнер и монтирует в него компонент `RegisterForm`,
     * передавая ему необходимые колбэки и роутер.
     * @protected
     */
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

        const supportFrameContainer = this.element?.querySelector('[data-component="register-page__support-frame-container"]');
        this.supportFrame = new SupportFrame({});
        this.supportFrame.mount(supportFrameContainer as HTMLElement);

        const supportButtonContainer = this.element?.querySelector('[data-component="register-page__support-button-container"]');
        this.supportButton = new Button({
            label: "?",
            class: "login-page__support-button",
            onClick: () => {
                this.supportFrame?.show();
            }
        });
        this.supportButton.mount(supportButtonContainer as HTMLElement);
    }

    public beforeUnmount(): void {
        this.form?.unmount();
        this.supportFrame?.unmount();
    }
}