import { BasePage } from '../../core/base/basePage.js';
import { AuthForm } from '../../components/composite/authForm/authForm.js';


/**
 * Страница входа. Отображает форму авторизации (AuthFor m).
 */
export class LoginPage extends BasePage {
    /**
     * @param {object} [props={}] - Свойства страницы.
     * @param {import Router} props.router - Роутер приложения.
     */
    constructor (props = {}) {
        super(props);

        /** @type {string} Имя Handlebars-шаблона */
        this.tempName = "pages/login/login";
    }

    /**
     * Создаёт и монтирует {@link AuthForm} в `.login-card`.
     * При переходе на регистрацию вызывает навигацию на `/register`.
     */
    afterMount() {
        super.afterMount();
        
        /** @type {AuthForm} Форма авторизации */
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

    /**
     * Размонтирует форму авторизации.
     */
    beforeUnmount() {
        this.form?.unmount();
    };
};