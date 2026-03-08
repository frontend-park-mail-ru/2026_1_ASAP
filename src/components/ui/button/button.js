import { BaseComponent } from '../../../core/base/baseComponent.js';

export class Button extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.class = props.class;
        this.label = props.label || "";
        this.icon = props.icon || "";
    }
    render() {
        const button = document.createElement('button');
        button.className = this.class;
        button.textContent = this.label || "";
        if (this.icon !== "") {
            const img = document.createElement('img');
            img.src = this.icon;
            button.appendChild(img);
        }
        const variant = this.props.variant || 'primary';

        button.className = `ui-button ui-button__${variant}`;
        button.textContent = this.props.label || 'Button';

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