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
    }

    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-input-wrapper';

        const input = document.createElement('input');
        input.className = this.class;
        input.name = this.name;
        input.placeholder = this.placeholder;
        input.type = this.type;
        input.required = this.required;
        wrapper.appendChild(input);

        if (this.type === 'password' && this.togglePassword) {
            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'ui-input__toggle-password';
            toggleIcon.innerHTML = `
                <img src="../../assets/images/icons/closeEye.svg" alt="Показать пароль" />
            `;
            wrapper.appendChild(toggleIcon);
        }

        return wrapper;
    }

    afterMount() {
        this.inputElement = this.element.querySelector('input');

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

    beforeUnmount() {
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
}