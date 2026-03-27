import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent.js";

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
 */
export interface InputProps extends IBaseComponentProps {
    class?: string;
    placeholder?: string;
    name?: string;
    type?: string;
    required?: boolean;
    togglePassword?: boolean;
    showErrorText?: boolean;
    onClick?: (event: MouseEvent) => void;
}

/**
 * Компонент текстового поля ввода с поддержкой ошибок валидации
 * и переключения видимости пароля.
 */
export class Input extends BaseComponent<InputProps> {
    private _error: string = "";
    private inputElement: HTMLInputElement | null = null;
    private errorElement: HTMLElement | null = null;
    private toggleIconElement: HTMLImageElement | null = null;
    private inputHandler: (() => void) | null = null;
    private togglePasswordHandler: (() => void) | null = null;

    /**
     * @param {InputProps} [props={}] - Свойства компонента.
     */
    constructor(props: InputProps = {}) {
        super(props);
        this.tempName = "components/ui/input/input";
        this.props.class = props.class || "";
        this.props.placeholder = props.placeholder || "";
        this.props.name = props.name || "";
        this.props.type = props.type || "";
        this.props.required = props.required || false;
        this.props.togglePassword = props.togglePassword || false;
        this.props.showErrorText = props.showErrorText !== false;
    }

    /**
     * @override
     */
    protected afterMount(): void {
        this.inputElement = this.element?.querySelector('input') || null;
        if (!this.inputElement) {
            console.warn(`Input component ${this.constructor.name} did not find its input element.`);
            return;
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
                    const isPassword = this.inputElement.type === 'password';
                    this.inputElement.type = isPassword ? 'text' : 'password';

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