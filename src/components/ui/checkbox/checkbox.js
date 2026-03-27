import { BaseComponent } from "../../../core/base/baseComponent.js";
import template from "./checkbox.hbs";

/**
 * Компонент чекбокса.
 */
export class Checkbox extends BaseComponent {

    /**
     * @param {object} [props={}] - Свойства.
     * @param {string} [props.label=''] - Текст метки.
     * @param {string} [props.name=''] - Имя для FormData.
     * @param {boolean} [props.checked=false] - Начальное состояние.
     */
    constructor(props = {}) {
        super(props);

        this.label = props.label || "";
        this.name = props.name || "";
        this.checked = props.checked || false;
    }

    getTemplate() {
        return template;
    }

    /**
     * Монтирует дочерние компоненты и находит элемент ошибки формы.
     */
    afterMount() {
        this.inputElement = this.element.querySelector('.ui-checkbox__input');
    }


    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {}

    /**
     * Текущее состояние чекбокса.
     * @type {boolean}
     */
    get value() {
        return this.element
            .querySelector(".ui-checkbox__input")
            .checked;
    }

}