export class BasePage {
    constructor(props = {}) {
        this.props = props;
        this.root = document.createElement("div");
        this.root.className = "page";
    }

    mount() {
        this.afterMount();
    }

    afterMount() {}

    beforeUnmount() {}

    unmount() {
        this.beforeUnmount();
        this.root.innerHTML = "";
    }
}