import { BaseComponent } from "../../../core/base/baseComponent.js";

export class Input extends BaseComponent {
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
        this.tempPath = "/components/ui/input/input.hbs";
    }

    async afterMount() {
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

    async beforeUnmount() {
        if (this.type === 'password' && this.togglePassword && this.toggleIconElement) {
            this.toggleIconElement.parentNode.removeEventListener('click', this.togglePasswordHandler);
        }

        if (this.props.onClick && this.inputElement) {
            this.inputElement.removeEventListener("click", this.props.onClick);
        }
    }

    get value() {
        return this.element.querySelector('input').value;
    }
    
    set value(val) {
        this.element.querySelector('input').value = val;
    }

    setError(message) {
        this._error = message;
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.element.classList.add('ui-input-wrapper--error');
            this.errorElement.style.opacity = '1'; 


        }
    }
    
    clearError() {
            this._error = ''; 
            if (this.errorElement) {
                this.errorElement.textContent = '';
                this.element.classList.remove('ui-input-wrapper--error');
                this.errorElement.style.opacity = '0';
            }  
        }  
}