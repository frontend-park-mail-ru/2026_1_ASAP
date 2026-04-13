import { BaseComponent, IBaseComponentProps } from "./baseComponent";

/**
 * @interface IBaseFormProps - Базовый интерфейс для свойств формы.
 */
export interface IBaseFormProps extends IBaseComponentProps {} // Расширяем IBaseComponentProps

/**
 * Базовый компонент формы. Автоматически находит form в разметке,
 * перехватывает событие submit и делегирует обработку в метод onSubmit.
 * @abstract
 */
export class BaseForm<P extends IBaseFormProps = IBaseFormProps> extends BaseComponent<P> {
    /**
     * HTML-элемент формы, найденный внутри компонента.
     * @protected
     */
    protected form: HTMLFormElement | null = null;

    /**
     * Обработчик события submit формы.
     * @protected
     */
    protected submitHandler: ((event: SubmitEvent) => void) | null = null;

    /**
     * Создаёт экземпляр BaseForm.
     * @param {P} [props={}] - Свойства компонента.
     */
    constructor(props: P = {} as P) {
        super(props);
    }

    /**
     * Находит элемент form после монтирования и привязывает обработчик submit.
     * @protected
     * @override
     */
    protected afterMount(): void {
        if (this.element && this.element.tagName === "FORM") {
            this.form = this.element as HTMLFormElement;
        } else if (this.element) {
            this.form = this.element.querySelector("form");
        }

        if (!this.form) { return }

        this.submitHandler = this.handleSubmit.bind(this);
        this.form.addEventListener("submit", this.submitHandler);
    }

    /**
     * Обрабатывает событие submit: собирает данные формы и передаёт в onSubmit.
     * @param {SubmitEvent} event - Событие отправки формы.
     * @private
     */
    private handleSubmit(event: SubmitEvent): void {
        event.preventDefault();

        if (!this.form) {
            console.error("Попытка отправить форму, которая не найдена");
            return;
        }

        const formData = new FormData(this.form);
        const data: { [key: string]: string | File } = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        this.onSubmit(data);
    }

    /**
     * Обработчик данных формы. Должен быть реализован в наследнике.
     * @param {object} data - Данные полей формы в виде { name: value }.
     * @returns {Promise<void>}
     * @abstract
     */
    protected async onSubmit(data: { [key: string]: string | File }): Promise<void> {
        throw new Error(`Метод onSubmit должен быть реализован в наследнике ${this.constructor.name}`);
    }

    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     * @protected
     * @override
     */
    protected beforeUnmount(): void {
        this.form?.removeEventListener("submit", this.submitHandler as EventListener);
        this.submitHandler = null;
        this.form = null;
    }
}