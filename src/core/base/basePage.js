export class BasePage {

    constructor(props = {}) {

        this.props = props;

        this.root = document.createElement("div");
        this.root.className = "page";

    }

    render() {
        return document.createElement("div");
    }

    mount() {

        this.element = this.render();

        this.root.innerHTML = "";

        this.root.appendChild(this.element);

        this.afterMount();

    }

    afterMount() {}

    beforeUnmount() {}

    unmount() {

        this.beforeUnmount();

        this.root.innerHTML = "";

    }

}