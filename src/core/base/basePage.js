import { loadTemplate } from "../templateLoader.js";

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
            this.temp = await loadTemplate(modulePath);
        }

        return this.temp(this.props);
    }

    async mount() {
        const htmlString = await this.render();

        this.root.innerHTML = htmlString.trim();

        this.element = this.root.firstElementChild || this.root;

        if (!this.element) {
            throw new Error("Ошибка при рендеринге страницы: не удалось создать элемент из шаблона");
        }

        await this.afterMount();
    }

    async afterMount() {}

    async beforeUnmount() {}

    async unmount() {
        await this.beforeUnmount();
        this.root.innerHTML = "";
    }

}