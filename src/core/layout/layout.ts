/**
 * Корневой лейаут приложения. Рендерит общую HTML-обёртку
 * и вставляет контент страницы в .layout__content.
 */
export class Layout {
    /**
     * Корневой DOM-элемент приложения, в который всё рендерится.
     * @private
     */
    private root: HTMLElement;

    /**
     * Имя Handlebars-шаблона для лейаута.
     * @private
     */
    private tempName: string = 'core/layout/layout';

    /**
     * Создаёт экземпляр Layout.
     * @throws {Error} Если корневой элемент с id="app" не найден в DOM.
     */
    constructor() {
        const rootElement = document.getElementById('app');
        if (!rootElement) {
            throw new Error('Root element with id="app" not found in the DOM.');
        }
        this.root = rootElement;
    }

    /**
     * Рендерит лейаут и вставляет контент страницы.
     * @param {HTMLElement} content - Корневой элемент страницы для вставки.
     * @throws {Error} Если шаблон лейаута не найден или не удалось найти .layout__content.
     */
    public render(content: HTMLElement): void {
        const template = Handlebars.templates[this.tempName];
        if (!template) {
            throw new Error(`Шаблон ${this.tempName} не найден`);
        }

        this.root.innerHTML = template({});

        const contentContainer = this.root.querySelector('.layout__content');
        if (!contentContainer) {
            throw new Error('Content container with class ".layout__content" not found in the layout template.');
        }

        contentContainer.appendChild(content);
    }
}