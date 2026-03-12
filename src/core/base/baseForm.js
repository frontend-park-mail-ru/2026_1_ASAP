import { BaseComponent } from "./baseComponent.js";

export class BaseForm extends BaseComponent {
    async afterMount() {
        if (this.element && this.element.tagName === "FORM") {
            this.form = this.element;
        } else if (this.element) {
            this.form = this.element.querySelector("form");
        }

        if (!this.form) {
            console.warn("Компонент не содержит форму для обработки submit");
            return;
        }

        this.submitHandler = this.handleSubmit.bind(this);
        this.form.addEventListener("submit", this.submitHandler);
    }

    async handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        awaitthis.onSubmit(data);
    }

    async onSubmit() {
        throw new Error("Метод onSubmit должен быть реализован в наследнике");
    }

    asyncbeforeUnmount() {
        this.form?.removeEventListener("submit", this.submitHandler);
    }
}