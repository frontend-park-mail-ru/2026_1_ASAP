import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './input.hbs';

/**
 * @interface InputProps - Свойства компонента.
 * @property {string} [class=''] - CSS-класс.
 * @property {string} [placeholder=''] - Плейсхолдер.
 * @property {string} [name=''] - Имя поля для FormData.
 * @property {string} [type=''] - Тип инпута ('text', 'password', 'email' и др.).
 * @property {boolean} [required=false] - Обязательность поля.
 * @property {boolean} [togglePassword=false] - Показывать ли кнопку показа/скрытия пароля.
 * @property {boolean} [showErrorText=true] - Показывать ли текст ошибки.
 * @property {Function} [onClick] - Обработчик клика по инпуту.
 * @property {string} [autocomplete] - Атрибут автозаполнения браузером.
 * @property {string} [value] - Начальное значение поля.
 */
export interface InputProps extends IBaseComponentProps {
    class?: string;
    placeholder?: string;
    name?: string;
    type?: string;
    value?: string;
    required?: boolean;
    togglePassword?: boolean;
    showErrorText?: boolean;
    onClick?: (event: MouseEvent) => void;
    autocomplete?: string;
}

/**
 * Компонент текстового поля ввода с поддержкой ошибок валидации
 * и переключения видимости пароля.
 */
export class Input extends BaseComponent<InputProps> {
    private _error: string = "";
    private inputElement: HTMLInputElement | HTMLTextAreaElement | null = null;
    private errorElement: HTMLElement | null = null;
    private toggleIconElement: HTMLImageElement | null = null;
    private inputHandler: (() => void) | null = null;
    private togglePasswordHandler: (() => void) | null = null;

    /**
     * @param {InputProps} [props={}] - Свойства компонента.
     */
    constructor(props: InputProps = {}) {
        super(props);
        this.props.class = props.class || "";
        this.props.placeholder = props.placeholder || "";
        this.props.name = props.name || "";
        this.props.type = props.type || "";
        this.props.required = props.required || false;
        this.props.togglePassword = props.togglePassword || false;
        this.props.showErrorText = props.showErrorText !== false;
        this.props.value = props.value || "";
    }
  
    getTemplate() {
        return template;
    }

    /**
     * @override
     */
    protected afterMount(): void {
        if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
            this.inputElement = this.element;
        } else {
            this.inputElement = this.element?.querySelector('input') || this.element?.querySelector('textarea') || null;
        }
        if (!this.inputElement) {
            console.warn(`Input component ${this.constructor.name} did not find its input element.`);
            return;
        }
        
        if (this.props.value) {
            this.inputElement.value = this.props.value;
        }

        if (this.props.showErrorText) {
            this.errorElement = this.element?.querySelector('.ui-input__error-message') || null;
        }

        this.inputHandler = () => {
            if (this._error) {
                this.clearError();
            }
        };
        this.inputElement.addEventListener('input', this.inputHandler);

        if (this.props.type === 'password' && this.props.togglePassword) {
            this.toggleIconElement = this.element?.querySelector('.ui-input__toggle-password img') || null;

            if (this.toggleIconElement) {
                this.togglePasswordHandler = () => {
                    if (!this.inputElement) return;
                    const input = this.inputElement as HTMLInputElement;
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';

                    this.toggleIconElement!.src = isPassword
                        ? '/assets/images/icons/openEye.svg'
                        : '/assets/images/icons/closeEye.svg';
                    this.toggleIconElement!.alt = isPassword
                        ? 'Скрыть пароль'
                        : 'Показать пароль';
                };
                this.toggleIconElement.parentNode?.addEventListener('click', this.togglePasswordHandler);
            }
        }

        if (this.props.onClick && this.inputElement) {
            this.inputElement.addEventListener("click", this.props.onClick as EventListener);
        }
    }

    /**
     * @override
     */
    protected beforeUnmount(): void {
        if (this.inputElement && this.inputHandler) {
            this.inputElement.removeEventListener('input', this.inputHandler);
        }

        if (this.props.type === 'password' && this.props.togglePassword && this.toggleIconElement && this.togglePasswordHandler) {
            this.toggleIconElement.parentNode?.removeEventListener('click', this.togglePasswordHandler);
        }

        if (this.props.onClick && this.inputElement) {
            this.inputElement.removeEventListener("click", this.props.onClick as EventListener);
        }
        this.inputElement = null;
        this.errorElement = null;
        this.toggleIconElement = null;
        this.inputHandler = null;
        this.togglePasswordHandler = null;
    }

    /**
     * Текущее значение поля ввода.
     * @type {string}
     */
    public get value(): string {
        return this.inputElement?.value || '';
    }

    /**
     * Устанавливает значение поля ввода.
     * @param {string} val
     */
    public set value(val: string) {
        if (this.inputElement) {
            this.inputElement.value = val;
        }
    }

    /**
     * Устанавливает сообщение об ошибке и добавляет CSS-класс ошибки.
     * @param {string} message - Текст ошибки.
     */
    public setError(message: string): void {
        this._error = message;
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.element?.classList.add('ui-input-wrapper--error');
            this.errorElement.style.opacity = '1';
        }
    }

    /**
     * Очищает сообщение об ошибке и убирает CSS-класс ошибки.
     */
    public clearError(): void {
        this._error = '';
        if (this.errorElement) {
            this.errorElement.textContent = '';
            this.element?.classList.remove('ui-input-wrapper--error');
            this.errorElement.style.opacity = '0';
        }
    }
}