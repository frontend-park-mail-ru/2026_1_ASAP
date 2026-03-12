import { loadTemplate } from "../tempLoader.js";

export class BaseComponent {
    constructor(props = {}) {
        this.props = props;
        this.element = null;
        this.tempPath = "";
        this.temp = null;
    }

    async render() {
        if (!this.tempPath) {
            throw new Error(`tempPath не указан для компонента ${this.constructor.name}`);
        }

        if (!this.temp) {
            const modulePath = this.tempPath.replace('.hbs', '.precompiled.js');
            this.temp = await loadTemp(modulePath);
        }

        return this.temp(this.props);
    }

    async mount(container) {
        if (!container) {
            throw new Error("Койнтейнер для монтирования не указан");
        }

        const htmlString = await this.render();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString.trim();
        container.innerHTML = htmlString;

        this.element= tempDiv.firstElementChild;

        if (!this.element) {
            throw new Error("Ошибка при рендеринге компонента: не удалось создать элемент из шаблона");
        }
        
        await this.afterMount();
    }

    async afterMount() {}

    async beforeUnmount() {};

    async unmount() {
        await this.beforeUnmount();
        this.element?.remove();
    }
}