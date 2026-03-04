import { BaseComponent } from "./baseComponent.js";

export class BaseForm extends BaseComponent {
    afterMount() {
        this.form = this.element.querySelector("form");
        this.submitHandler = this.handleSubmit.bind(this);

        this.form.addEventListener("submit", this.submitHandler);
    }

    handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        this.onSubmit(data);
    }

    onSubmit() {
        throw new Error("Метод onSubmit должен быть реализован в наследнике");
    }

    beforeUnmount() {
        this.form?.removeEventListener("submit", this.submitHandler);
    }
}