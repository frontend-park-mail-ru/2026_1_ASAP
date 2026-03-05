export class BaseComponent {
    constructor(props = {}) {
        this.props = props;
        this.element = null;
    }
    render() {
        throw new Error('Метод render должен быть реализован в наследнике');
    }
    mount(container) {
        this.element = this.render();
        container.appendChild(this.element);
        this.afterMount();
    }
    afterMount() {};

    beforeUnmount() {};

    unmount() {
        this.beforeUnmount();
        this.element?.remove();
    }
}