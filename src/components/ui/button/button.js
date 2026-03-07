import { BaseComponent } from '../../../core/base/baseComponent.js';

export class Button extends BaseComponent {
    render() {
        const button = document.createElement('button');
        const variant = this.props.variant || 'primary';

        button.className = `ui-button ui-button__${variant}`;
        button.textContent = this.props.label || 'Button';

        return button;
    }
    afterMount() {
        if (this.props.onClick) {
            this.root.addEventListener("click", this.props.onClick);
        }
    }
    beforeUnmount() {
        if (this.props.onClick) {
            this.root.removeEventListener("click", this.props.onClick);
        }
    }   
}