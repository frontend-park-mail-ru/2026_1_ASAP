/**
 * Корневой лейаут приложения. Рендерит общую HTML-обёртку
 * и вставляет контент страницы в .layout__content.
 */
export class Layout {
    constructor() {
        /** @type {HTMLElement} Корневой DOM-элемент приложения*/
        this.root = document.getElementById('app');

        /** @type {string} Имя шаблона */
        this.tempName = 'core/layout/layout';
    }

    /**
     * Рендерит лейаут и вставляет контент страницы.
     * @param {HTMLElement} content - Корневой элемент страницы.
     * @throws {Error} Если шаблон лейаута не найден.
     */
    render(content) {
        const template = Handlebars.templates[this.tempName];
        if (!template) {
            throw new Error(`Шаблон ${this.tempName} не найден`);
        }

        this.root.innerHTML = template({});
        this.root.querySelector('.layout__content').appendChild(content);
    }
}
