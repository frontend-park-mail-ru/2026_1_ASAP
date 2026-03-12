import { BaseComponent } from '../../../core/base/baseComponent.js';

export class Button extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.class = props.class || "";
        this.label = props.label || "";
        this.icon = props.icon || "";
        this.type = props.type || "button";
        this.tempPath = "/components/ui/button/button.hbs";
    }

    async afterMount() {
        if (this.props.onClick) {
            this.element.addEventListener("click", this.props.onClick);
        }
    }
    async beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    }   
}