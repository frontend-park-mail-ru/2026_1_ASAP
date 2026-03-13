import { BaseComponent } from "../../../core/base/baseComponent.js";

/**
 * Компонент текстового поля ввода с поддержкой ошибок валидации
 * и переключения видимости пароля.
 */
export class Input extends BaseComponent {
    /**
     * @param {object} [props={}] - Свойства компонента.
     * @param {string} [props.class=''] - CSS-класс.
     * @param {string} [props.placeholder=''] - Плейсхолдер.
     * @param {string} [props.name=''] - Имя поля для FormData.
     * @param {string} [props.type=''] - Тип инпута ('text', 'password', 'email' и др.).
     * @param {boolean} [props.required=false] - Обязательность поля.
     * @param {boolean} [props.togglePassword=false] - Показывать ли кнопку показа/скрытия пароля.
     * @param {boolean} [props.showErrorText=true] - Показывать ли текст ошибки.
     * @param {Function} [props.onClick] - Обработчик клика по инпуту.
     */
    constructor(props={}) {
        super(props);
        this.class = props.class || "";
        this.placeholder = props.placeholder || "";
        this.name = props.name || "";
        this.type = props.type || "";
        this.required = props.required || false;
        this.togglePassword = props.togglePassword || false; 
        this._error =  "";
        this.showErrorText = props.showErrorText !== false;
        this.tempName = "components/ui/input/input";
    }

    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        this.inputElement = this.element.querySelector('input');
        if (this.showErrorText) {
            this.errorElement = this.element.querySelector('.ui-input__error-message');
        }

        if (this.type === 'password' && this.togglePassword) {
            this.toggleIconElement = this.element.querySelector('.ui-input__toggle-password img'); 

            this.togglePasswordHandler = () => {
                const isPassword = this.inputElement.type === 'password';
                this.inputElement.type = isPassword ? 'text' : 'password';

                this.toggleIconElement.src = isPassword 
                    ? '/assets/images/icons/openEye.svg' 
                    : '/assets/images/icons/closeEye.svg';
                this.toggleIconElement.alt = isPassword 
                    ? 'Скрыть пароль' 
                    : 'Показать пароль';
            };

            this.toggleIconElement.parentNode.addEventListener('click', this.togglePasswordHandler);
        }
    
        if (this.props.onClick && this.inputElement) {
            this.inputElement.addEventListener("click", this.props.onClick);
        }
    }

    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {
        if (this.type === 'password' && this.togglePassword && this.toggleIconElement) {
            this.toggleIconElement.parentNode.removeEventListener('click', this.togglePasswordHandler);
        }

        if (this.props.onClick && this.inputElement) {
            this.inputElement.removeEventListener("click", this.props.onClick);
        }
    }

    /**
     * Текущее значение поля ввода.
     * @type {string}
     */
    get value() {
        return this.element.querySelector('input').value;
    }
    
    /** @param {string} val */
    set value(val) {
        this.element.querySelector('input').value = val;
    }

    /**
     * Устанавливает сообщение об ошибке и добавляет CSS-класс ошибки.
     * @param {string} message - Текст ошибки.
     */
    setError(message) {
        this._error = message;
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.element.classList.add('ui-input-wrapper--error');
            this.errorElement.style.opacity = '1'; 
        }
    }
    
    /**
     * Очищает сообщение об ошибке и убирает CSS-класс ошибки.
     */
    clearError() {
            this._error = ''; 
            if (this.errorElement) {
                this.errorElement.textContent = '';
                this.element.classList.remove('ui-input-wrapper--error');
                this.errorElement.style.opacity = '0';
            }  
        }  
}