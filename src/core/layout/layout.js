import template from "./layout.hbs";
/**
 * Корневой лейаут приложения. Рендерит общую HTML-обёртку
 * и вставляет контент страницы в .layout__content.
 */
export class Layout {
    constructor() {
        /** @type {HTMLElement} Корневой DOM-элемент приложения*/
        this.root = document.getElementById('app');
    }

    /**
     * Рендерит лейаут и вставляет контент страницы.
     * @param {HTMLElement} content - Корневой элемент страницы.
     * @throws {Error} Если шаблон лейаута не найден.
     */
    render(content) {
        this.root.innerHTML = template({});
        this.root.querySelector('.layout__content').appendChild(content);
    }
}
