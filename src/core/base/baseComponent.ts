/**
 * @interface IBaseComponentProps - Базовый интерфейс для свойств любого компонента.
 *                                  Позволяет принимать любые свойства.
 */
export interface IBaseComponentProps {
    [key: string]: any;
}

/**
 * Базовый компонент, от которого наследуются все UI-компоненты.
 * Предоставляет жизненный цикл (render, mount, unmount) и работу с Handlebars-шаблонами.
 * @abstract
 */
export class BaseComponent<P extends IBaseComponentProps = IBaseComponentProps> {
    /**
     * Свойства компонента, передаваемые в шаблон.
     * @type {P}
     */
    public _props: P;

    /**
     * Корневой DOM-элемент компонента.
     * @type {HTMLElement|null}
     */
    public _element: HTMLElement | null = null;

    /**
     * Имя Handlebars-шаблона в глобальном реестре `Handlebars.templates`.
     * @type {string}
     */
    protected tempName: string = "";

    /**
     * Создаёт экземпляр BaseComponent.
     * @param {P} [props={}] - Свойства компонента, передаваемые в шаблон.
     */
    constructor(props: P = {} as P) {
        this._props = props;
    }
  
    getTemplate() {
        throw new Error(`getTemplate должен быть реализован в ${this.constructor.name}`);
    }

    public get element(): HTMLElement | null {
        return this._element;
    }

    public get props(): P {
        return this._props;
    }

    /**
     * Генерирует DOM-элемент из Handlebars-шаблона и пропсов.
     * @returns {HTMLElement} Корневой DOM-элемент компонента.
     * @throws {Error} Если tempName не задан или шаблон не найден.
     */
    public render(): HTMLElement {
        const template = this.getTemplate();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = template(this.props).trim();
        return wrapper.firstElementChild as HTMLElement;
    }

    /**
     * Монтирует компонент в указанный DOM-контейнер.
     * @param {HTMLElement} container - Контейнер для монтирования.
     * @throws {Error} Если контейнер не указан.
     */
    public mount(container: HTMLElement): void {
        if (!container) {
            throw new Error("Контейнер для монтирования не указан");
        }
        this._element = this.render();
        container.appendChild(this._element);
        this.afterMount();
    }

    /**
     * Хук, вызываемый после монтирования. Переопределяется в наследниках.
     * @protected
     */
    protected afterMount(): void {}

    /**
     * Хук, вызываемый перед размонтированием. Переопределяется в наследниках.
     * @protected
     */
    protected beforeUnmount(): void {}

    /**
     * Размонтирует компонент: вызывает beforeUnmount() и удаляет элемент из DOM.
     */
    public unmount(): void {
        this.beforeUnmount();
        this._element?.remove();
    }
}