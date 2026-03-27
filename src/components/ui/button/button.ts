import { BaseComponent } from '../../../core/base/baseComponent';
import template from './button.hbs';

/**
 * Компонент кнопки. Поддерживает текстовую метку, иконку и обработчик клика.
 */
export class Button extends BaseComponent {
    /**
     * @param {object} [props={}] - Свойства кнопки.
     * @param {string} [props.class=''] - CSS-класс.
     * @param {string} [props.label=''] - Текст кнопки.
     * @param {string} [props.icon=''] - URL иконки.
     * @param {string} [props.type='button'] - Тип кнопки ('button', 'submit').
     * @param {Function} [props.onClick] - Обработчик клика.
     */
    constructor(props={}) {
        super(props);
        this.class = props.class || "";
        this.label = props.label || "";
        this.icon = props.icon || "";
        this.type = props.type || "button";
    }

    getTemplate() {
        return template;
    }

    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        if (this.props.onClick) {
            this.element.addEventListener("click", this.props.onClick);
        }
    }

    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    }   
}