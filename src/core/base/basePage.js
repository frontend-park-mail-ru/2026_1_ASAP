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
    }

    getTemplate() {
        throw new Error(`getTemplate должен быть реализован в ${this.constructor.name}`);
    }

    /**
     * Рендерит шаблон страницы в root.
     * @returns {HTMLElement} Корневой элемент страницы.
     * @throws {Error} Если tempName не задан или шаблон не найден.
     */
    render() {
        const template = this.getTemplate();

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