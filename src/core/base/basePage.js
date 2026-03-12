export class BasePage {
    constructor(props = {}) {
        this.props = props;
        this.root = document.createElement("div");
        this.root.className = "page";
        this.tempName = "";
    }

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

    mount() {
        this.render();
        this.afterMount();
    }

    afterMount() {}

    beforeUnmount() {}

    unmount() {
        this.beforeUnmount();
        this.root.innerHTML = "";
    }

}