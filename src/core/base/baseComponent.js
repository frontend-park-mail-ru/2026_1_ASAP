export class BaseComponent {
    constructor(props = {}) {
        this.props = props;
        this.element = null;
        this.tempName = "";
    }

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

    mount(container) {
        if (!container) {
            throw new Error("Контейнер для монтирования не указан");
        }
        this.element = this.render();
        container.appendChild(this.element);
        this.afterMount();
    }

    afterMount() {}

    beforeUnmount() {}

    unmount() {
        this.beforeUnmount();
        this.element?.remove();
    }
}