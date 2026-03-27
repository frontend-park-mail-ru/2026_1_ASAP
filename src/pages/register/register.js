import { BasePage } from '../../core/base/basePage.js';
import { RegisterForm } from '../../components/composite/registerForm/registerForm.js';
import template from "./register.hbs";

/**
 * Страница регистрации. Отображает форму регистрации (RegisterForm). 
 */
export class RegisterPage extends BasePage {
    /**
     * @param {object} [props={}] - Свойства страницы.
     * @param {import Router} props.router - Роутер приложения.
     */
    constructor(props = {}) {
        super(props);
        /** @type {string} Имя Handlebars-шаблона */
    }

    getTemplate() {
        return template;
    };

    /**
     * Создаёт и монтирует {@link RegisterForm} в `.register-card`.
     * При переходе на логин вызывает навигацию на `/login`.
     * @override
     */
    afterMount() {
        /** @type {RegisterForm} Форма регистрации */
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

    /**
     * Размонтирует форму регистрации.
     */
    beforeUnmount() {
        this.form.unmount();
    }
}