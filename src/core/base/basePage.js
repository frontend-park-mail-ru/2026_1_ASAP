import { loadTemplate } from "../tempLoader.js";

export class BasePage {
    constructor(props = {}) {
        this.props = props;
        this.root = document.createElement("div");
        this.root.className = "page";
        this.tempPath = "";
        this.temp = null;
    }

    async render() {
        if (!this.tempPath) {
            throw new Error(`tempPath не указан для страницы ${this.constructor.name}`);
        }

        if (!this.temp) {
            const modulePath = this.tempPath.replace('.hbs', '.precompiled.js');
            this.temp = await loadTemp(modulePath);
        }

        return this.temp(this.props);
    }

    async mount() {
        const htmlString = await this.render();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString.trim();
        this.element = tempDiv.firstElementChild;

        if (!this.element) {
            throw new Error("Ошибка при рендеринге страницы: не удалось создать элемент из шаблона");
        }

        this.root.innerHTML = "";
        this.root.appendChild(this.element);
        await this.afterMount();
    }

    async afterMount() {}

    async beforeUnmount() {}

    async unmount() {
        await this.beforeUnmount();
        this.root.innerHTML = "";
    }

}