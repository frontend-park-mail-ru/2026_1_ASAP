import { BaseComponent } from "../../../core/base/baseComponent.js";

export class Checkbox extends BaseComponent {

    constructor(props = {}) {
        super(props);

        this.label = props.label || "";
        this.name = props.name || "";
        this.checked = props.checked || false;
        this.tempPath = "/components/ui/checkbox/checkbox.hbs";
    }
    async afterMount() {
        this.inputElement = this.element.querySelector('.ui-checkbox__input');
    }

    async beforeUnmount() {}

    get value() {
        return this.element
            .querySelector(".ui-checkbox__input")
            .checked;
    }

}