/**
 * Базовый класс страницы. Управляет рендерингом шаблона
 * в корневой контейнер root и предоставляет хуки жизненного цикла.
 * @abstract
 */
export class BasePage {
    /**
     * Создаёт экземпляр BasePage.
     * @param {object} [props={}] - Свойства страницы (router, pageManager и др.).
     */
    constructor(props = {}) {
        /** @type {object} */
        this.props = props;

        /** @type {HTMLDivElement} Корневой DOM-контейнер страницы. */
        this.root = document.createElement("div");
        this.root.className = "page";

        /** @type {string} Имя (путь)Handlebars-шаблона. */
        this.tempName = "";
    }

    /**
     * Рендерит шаблон страницы в root.
     * @returns {HTMLElement} Корневой элемент страницы.
     * @throws {Error} Если tempName не задан или шаблон не найден.
     */
    render() {
        if (!this.tempName) {
            throw new Error(`tempName не указан для страницы ${this.constructor.name}`);
        }
        
        const template = Handlebars.templates[this.tempName];
        if (!template) {
            throw new Error(`Шаблон ${this.tempName} не найден`);
        }

        this.root.innerHTML = template(this.props).trim();
        this.element = this.root.firstElementChild || this.root;
        return this.element;
    }

    /**
     * Рендерит страницу и вызывает хук afterMount.
     */
    mount() {
        this.render();
        this.afterMount();
    }

    afterMount() {}

    beforeUnmount() {}

    /**
     * Размонтирует страницу: вызывает beforeUnmount и очищает root.
     */
    unmount() {
        this.beforeUnmount();
        this.root.innerHTML = "";
    }

}