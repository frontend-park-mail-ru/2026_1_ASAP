import { BaseComponent } from "../../../core/base/baseComponent";
import template from "./metaChatInfo.hbs";

/**
 * Компонент метаинформации чата (время, счётчик непрочитанных).
 */
export class MetaChatInfo extends BaseComponent {
    constructor(props={}) {
        super(props);
    };

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
    };

    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    };
}