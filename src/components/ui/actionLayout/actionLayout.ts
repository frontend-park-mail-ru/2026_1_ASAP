import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from "./actionLayout.hbs";

/**
 * Свойства компонента ActionLayout.
 * @interface ActionLayoutProps
 * @property {BaseComponent | null} header - Компонент заголовка.
 * @property {BaseComponent | (BaseComponent | null)[] | null} content - Основной контент (один компонент или массив).
 */
interface ActionLayoutProps extends IBaseComponentProps {
    header: BaseComponent | null;
    content: (BaseComponent | null) | (BaseComponent | null)[];
}

/**
 * ActionLayout - компонент-обертка для создания стандартной разметки модальных окон или страниц действий.
 * Предоставляет слоты для заголовка и основного контента.
 * @class ActionLayout
 * @extends BaseComponent
 */
export class ActionLayout extends BaseComponent<ActionLayoutProps> {
    /**
     * Создает экземпляр ActionLayout.
     * @param {ActionLayoutProps} props - Свойства компонента.
     */
    constructor(props: ActionLayoutProps) {
        super(props);
    }

    /**
     * Возвращает шаблон компонента.
     * @returns {Function} Handlebars шаблон.
     */
    getTemplate() {
        return template;
    }

    /**
     * Выполняется после монтирования компонента в DOM.
     * Инициализирует и монтирует дочерние компоненты (заголовок и контент).
     * @protected
     * @returns {void}
     */
    protected afterMount(): void {
        if (!this.element) {
            console.error("ActionLayout: нет элемента для монтирования");
            return;
        }
        const headerSlot = this.element.querySelector('.action-layout__header');
        const contentSlot = this.element.querySelector('.action-layout__content');
        
        if (headerSlot) {
            this.props.header?.mount(headerSlot as HTMLElement);
        } else {
            console.error("ActionLayout: не найден слот для заголовка");
        }

        if (contentSlot) {
            if (Array.isArray(this.props.content)) {
                // Игнорируем null/undefined элементы
                this.props.content.forEach(component => component?.mount(contentSlot as HTMLElement));
            } else {
                this.props.content?.mount(contentSlot as HTMLElement);
            }
        }
    }

    /**
     * Выполняется перед удалением компонента из DOM.
     * Размонтирует все дочерние компоненты.
     * @protected
     * @returns {void}
     */
    protected beforeUnmount(): void {
        this.props.header?.unmount();
        if (Array.isArray(this.props.content)) {
            this.props.content.forEach(component => component?.unmount());
        } else {
            this.props.content?.unmount();
        }
    }
}