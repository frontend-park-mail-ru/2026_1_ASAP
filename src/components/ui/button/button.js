import { BaseComponent } from '../../../core/base/baseComponent.js';

export class Button extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.class = props.class || "";
        this.label = props.label || "";
        this.icon = props.icon || "";
        this.type = props.type || "button";
    }
    render() {
        const button = document.createElement('button');
        button.className = this.class;
        if (this.icon !== "") {
            const img = document.createElement('img');
            img.src = this.icon;
            button.appendChild(img);
        }

        if (this.label !== "") {
            const span = document.createElement('span');
            span.textContent = this.label;
            button.appendChild(span);
        }
        button.type = this.type;
        return button;
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