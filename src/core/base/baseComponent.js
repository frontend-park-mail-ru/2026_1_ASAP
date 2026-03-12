/**
 * Базовый компонент, от которого наследуются все UI-компоненты.
 * Предоставляет жизненный цикл (render, mount, unmount) и работу с Handlebars-шаблонами.
 * @abstract
 */
export class BaseComponent {
    /**
     * Создаёт экземпляр BaseComponent.
     * @param {object} [props={}] - Свойства компонента, передаваемые в шаблон.
     */
    constructor(props = {}) {
        /** @type {object} */
        this.props = props;

        /** @type {HTMLElement|null} */
        this.element = null;

        /**
         * Имя Handlebars-шаблона в глобальном реестре `Handlebars.templates`.
         * @type {string}
         */
        this.tempName = "";
    }

    /**
     * Генерирует DOM-элемент из Handlebars-шаблона и пропсов.
     * @returns {HTMLElement} Корневой DOM-элемент компонента.
     * @throws {Error} Если tempName не задан или шаблон не найден.
     */
    render() {
        if (!this.tempName) {
            throw new Error(`tempName не указан для компонента ${this.constructor.name}`);
        }
        const template = Handlebars.templates[this.tempName];
        if (!template) {
            throw new Error(`Шаблон ${this.tempName} не найден`);
        }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = template(this.props).trim();
        return wrapper.firstElementChild;
    }

    /**
     * Монтирует компонент в указанный DOM-контейнер.
     * @param {HTMLElement} container - Контейнер для монтирования.
     * @throws {Error} Если контейнер не указан.
     */
    mount(container) {
        if (!container) {
            throw new Error("Контейнер для монтирования не указан");
        }
        this.element = this.render();
        container.appendChild(this.element);
        this.afterMount();
    }

    /**
     * Хук, вызываемый после монтирования. Переопределяется в наследниках.
     * @protected
     */
    afterMount() {}

    /**
     * Хук, вызываемый перед размонтированием. Переопределяется в наследниках.
     * @protected
     */
    beforeUnmount() {}

    /**
     * Размонтирует компонент: вызывает beforeUnmount() и удаляет элемент из DOM.
     */
    unmount() {
        this.beforeUnmount();
        this.element?.remove();
    }
}