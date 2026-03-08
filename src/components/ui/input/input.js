import { BaseComponent } from "../../../core/base/baseComponent.js";

export class Input extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.class = props.class || "";
        this.placeholder = props.placeholder || "";
        this.name = props.name || "";
        this.type = props.type || "";
    }
    render() {
        const input = document.createElement('input');
        input.className = this.class;
        input.name = this.name;
        input.placeholder = this.placeholder;
        input.type = this.type;
        return input;
    }

    afterMount() {
        if (this.props.onClick) {
            this.element.addEventListener("click", this.props.onClick);
        }
    }

    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    }
}