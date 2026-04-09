import { IBaseComponentProps } from "./baseComponent";

/**
 * @interface IBasePageProps
 * @description Базовый интерфейс для свойств страницы.
 * Расширяет `IBaseComponentProps` и добавляет опциональные
 * ссылки на `router` и `pageManager`.
 * @property {any} [router] - Экземпляр роутера.
 * @property {any} [pageManager] - Экземпляр менеджера страниц.
 */
export interface IBasePageProps extends IBaseComponentProps {
    router?: any;
    pageManager?: any;
}

/**
 * @class BasePage
 * @extends BaseComponent
 * @template P - Тип объекта свойств, расширяющий `IBasePageProps`.
 * @description Абстрактный базовый класс для всех страниц приложения.
 * Управляет созданием корневого элемента страницы (`<div class="page">`),
 * рендерингом шаблона и предоставляет хуки жизненного цикла (`mount`, `unmount`, `updateProps`).
 *
 * @property {P} props - Свойства, переданные странице (включая `router` и `pageManager`).
 * @property {HTMLDivElement} root - Корневой DOM-контейнер для всей страницы.
 * @property {HTMLElement | null} element - Основной элемент, отрендеренный внутри `root`.
 */
export class BasePage<P extends IBasePageProps = IBasePageProps> {
    /**
     * Свойства страницы (router, pageManager и др.).
     * @type {P}
     */
    protected props: P;

    /**
     * Корневой DOM-контейнер страницы.
     * @type {HTMLDivElement}
     */
    public root: HTMLDivElement;

    /**
     * Корневой элемент, полученный после рендера шаблона.
     * Может отличаться от root, если шаблон возвращает не div.page.
     * @type {HTMLElement|null}
     */
    protected element: HTMLElement | null = null;


    /**
     * Создаёт экземпляр BasePage.
     * @param {P} [props={}] - Свойства страницы (router, pageManager и др.).
     */
    constructor(props: P = {} as P) {
        this.props = props;

        this.root = document.createElement("div");
        this.root.className = "page";
    }

    getTemplate(): (context?: object) => string {
        throw new Error(`getTemplate должен быть реализован в ${this.constructor.name}`);
    }

    /**
     * Рендерит содержимое шаблона в корневой элемент `root`.
     * @returns {HTMLElement | null} Основной отрендеренный элемент.
     */
    public render(): HTMLElement | null {
        const template = this.getTemplate();

        this.root.innerHTML = template(this.props).trim();
        this.element = (this.root.firstElementChild || this.root) as HTMLElement;
        return this.element;
    }

    /**
     * Выполняет монтирование страницы: рендерит контент и вызывает хук `afterMount`.
     * @returns {Promise<void>}
     */
    public async mount(): Promise<void> {
        this.render();
        await this.afterMount();
    }

    /**
     * Хук жизненного цикла, вызываемый после монтирования.
     * Предназначен для асинхронных операций после рендеринга.
     * @protected
     */
    protected async afterMount(): Promise<void> {}

    /**
     * Хук жизненного цикла, вызываемый перед размонтированием.
     * Предназначен для очистки ресурсов.
     * @protected
     */
    protected beforeUnmount(): void {}

    /**
     * Выполняет размонтирование страницы: вызывает `beforeUnmount` и очищает DOM.
     * @returns {Promise<void>}
     */
    public async unmount(): Promise<void> {
        this.beforeUnmount();
        this.root.innerHTML = "";
        this.element = null;
    }

    /**
     * Метод для обновления свойств страницы (например, при смене ID чата в URL).
     * Должен быть реализован в наследнике, если требуется динамическое обновление.
     * @param {P} newProps - Новые свойства.
     */
    public async updateProps?(newProps: P): Promise<void>;
}