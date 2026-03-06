import { BaseComponent } from "../../../core/base/baseComponent.js";

export class Checkbox extends BaseComponent {

    constructor(props = {}) {
        super(props);

        this.label = props.label || "";
        this.name = props.name || "";
        this.checked = props.checked || false;
    }

    render() {

        const wrapper = document.createElement("label");
        wrapper.className = "ui-checkbox";

        wrapper.innerHTML = `
            <input 
                type="checkbox"
                class="ui-checkbox__input"
                name="${this.name}"
                ${this.checked ? "checked" : ""}
            />

            <span class="ui-checkbox__box"></span>

            <span class="ui-checkbox__label">
                ${this.label}
            </span>
        `;

        return wrapper;
    }

    get value() {
        return this.element
            .querySelector(".ui-checkbox__input")
            .checked;
    }

}