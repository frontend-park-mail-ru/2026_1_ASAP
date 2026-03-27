import template from "./avatar.hbs";
import { BaseComponent } from "../../../core/base/baseComponent.js";

/**
 * Компонент аватара (изображение).
 */
export class Avatar extends BaseComponent {
    /**
     * @param {object} [props={}] - Свойства.
     * @param {string} [props.class] - CSS-класс.
     * @param {string} [props.src] - URL изображения.
     */
    constructor(props={}) {
        super(props);
    }

    getTemplate() {
        return template;
    }
}