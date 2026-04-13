/**
 * @interface IBaseComponentProps
 * @description Базовый интерфейс для свойств любого компонента.
 * Позволяет дочерним компонентам определять свои собственные свойства,
 * расширяя этот интерфейс.
 */
export interface IBaseComponentProps {
    [key: string]: any;
}

/**
 * @class BaseComponent
 * @template P - Тип объекта свойств, расширяющий `IBaseComponentProps`.
 * @description Абстрактный базовый класс для всех UI-компонентов в приложении.
 * Реализует основной жизненный цикл: рендеринг из Handlebars-шаблона,
 * монтирование в DOM и размонтирование.
 *
 * @property {P} props - Свойства компонента.
 * @property {HTMLElement | null} element - Корневой DOM-элемент компонента после рендеринга.
 */
export abstract class BaseComponent<P extends IBaseComponentProps = IBaseComponentProps> {
    /**
     * Свойства компонента, доступные для чтения и записи.
     * @protected
     */
    protected _props: P;

    /**
     * Корневой DOM-элемент компонента.
     * @protected
     */
    protected _element: HTMLElement | null = null;

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
  
    getTemplate(): (context?: object) => string {
        throw new Error(`getTemplate должен быть реализован в ${this.constructor.name}`);
    }

    public get element(): HTMLElement | null {
        return this._element;
    }

    /**
     * Геттер для доступа к свойствам компонента.
     * @returns {P}
     */
    public get props(): P {
        return this._props;
    }

    /**
     * Создает DOM-структуру компонента на основе его шаблона и свойств.
     * @returns {HTMLElement} Корневой DOM-элемент, готовый к монтированию.
     */
    public render(): HTMLElement {
        const template = this.getTemplate();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = template(this.props).trim();
        return wrapper.firstElementChild as HTMLElement;
    }

    /**
     * Монтирует компонент в указанный DOM-контейнер.
     * Вызывает `render()` для создания элемента, добавляет его в контейнер
     * и затем вызывает хук `afterMount()`.
     * @param {HTMLElement} container - DOM-элемент, в который будет вмонтирован компонент.
     * @throws {Error} Если контейнер не предоставлен.
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
     * Хук жизненного цикла, вызываемый сразу после монтирования компонента в DOM.
     * Предназначен для переопределения в дочерних классах для выполнения
     * пост-рендеринговых операций, таких как добавление обработчиков событий.
     * @protected
     */
    protected afterMount(): void {}

    /**
     * Хук жизненного цикла, вызываемый непосредственно перед удалением компонента из DOM.
     * Предназначен для переопределения в дочерних классах для очистки ресурсов,
     * например, удаления обработчиков событий.
     * @protected
     */
    protected beforeUnmount(): void {}

    /**
     * Размонтирует компонент.
     * Вызывает хук `beforeUnmount()` и затем удаляет корневой элемент компонента из DOM.
     */
    public unmount(): void {
        this.beforeUnmount();
        this._element?.remove();
    }
}