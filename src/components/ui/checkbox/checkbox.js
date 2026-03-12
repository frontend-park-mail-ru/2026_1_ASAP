import { BaseComponent } from "../../../core/base/baseComponent.js";

export class Checkbox extends BaseComponent {

    constructor(props = {}) {
        super(props);

        this.label = props.label || "";
        this.name = props.name || "";
        this.checked = props.checked || false;
        this.tempName = "components/ui/checkbox/checkbox";
    }
    afterMount() {
        this.inputElement = this.element.querySelector('.ui-checkbox__input');
    }

    beforeUnmount() {}

    get value() {
        return this.element
            .querySelector(".ui-checkbox__input")
            .checked;
    }

}