import { BaseComponent } from "./baseComponent";

/**
 * Базовый компонент формы. Автоматически находит form в разметке,
 * перехватывает событие submit и делегирует обработку в метод onSubmit.
 * @abstract
 */
export class BaseForm extends BaseComponent {
    /**
     * Находит элемент form после монтирования и привязывает обработчик submit.
     * @protected
     */
    afterMount() {
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

    /**
     * Обрабатывает событие submit: собирает данные формы и передаёт в onSubmit.
     * @param {SubmitEvent} event - Событие отправки формы.
     * @private
     */
    handleSubmit(event) {
        event.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());

        this.onSubmit(data);
    }

    /**
     * Обработчик данных формы. Должен быть реализован в наследнике.
     * @param {object} data - Данные полей формы в виде { name: value }.
     * @returns {Promise<void>}
     * @abstract
     * @throws {Error} Если не переопределён в наследнике.
     */
    onSubmit() {
        throw new Error("Метод onSubmit должен быть реализован в наследнике");
    }

    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {
        this.form?.removeEventListener("submit", this.submitHandler);
    }
}