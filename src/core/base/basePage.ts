import { IBaseComponentProps } from "./baseComponent";

/**
 * @interface IBasePageProps - Базовый интерфейс для свойств страницы.
 */
export interface IBasePageProps extends IBaseComponentProps {
    router?: any;
    pageManager?: any;
}

/**
 * Базовый класс страницы. Управляет рендерингом шаблона
 * в корневой контейнер root и предоставляет хуки жизненного цикла.
 * @abstract
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
     * Рендерит шаблон страницы в root.
     * @returns {HTMLElement} Корневой элемент страницы.
     * @throws {Error} Если tempName не задан или шаблон не найден.
     */
    public render(): HTMLElement | null {
        const template = this.getTemplate();

        this.root.innerHTML = template(this.props).trim();
        this.element = (this.root.firstElementChild || this.root) as HTMLElement;
        return this.element;
    }

    /**
     * Рендерит страницу и вызывает хук afterMount.
     */
    public async mount(): Promise<void> {
        this.render();
        await this.afterMount();
    }

    /**
     * Хук, вызываемый после монтирования. Переопределяется в наследниках.
     * @protected
     */
    protected async afterMount(): Promise<void> {}

    /**
     * Хук, вызываемый перед размонтированием. Переопределяется в наследниках.
     * @protected
     */
    protected beforeUnmount(): void {}

    /**
     * Размонтирует страницу: вызывает beforeUnmount и очищает root.
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