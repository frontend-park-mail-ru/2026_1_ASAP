/**
 * Клиентский роутер. Обрабатывает навигацию через History API
 * и делегирует открытие страниц в PageManager.
 */
export class Router {
    /**
     * @param {Object<string, typeof BasePage>} routes - Маршруты.
     */
    constructor(routes) {
        /** @type {Object<string, typeof BasePage>} */
        this.routes = routes;
        
        /** @type {import PageManager|null} */
        this.pageManager = null;
    }

    /**
     * Инициализирует роутер: подписывается на popstate и обрабатывает текущий маршрут.
     */
    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    /**
     * Определяет текущий маршрут и открывает соответствующую страницу.
     * @returns {Promise<void>}
     * @throws {Error} Если PageManager не установлен.
     */
    async handleRoute() {
        if (!this.pageManager) {
            throw new Error("PageManager не установлен в Router");
        }

        const path = window.location.pathname;
        const PageClass = this.routes[path] || this.routes['/'];

        if (PageClass) {
            await this.pageManager.open(PageClass);
        }
    }

    /**
     * Выполняет навигацию на указанный путь.
     * @param {string} path - URL-путь (например, '/chats').
     */
    navigate(path) {
        history.pushState({}, '', path);
        this.handleRoute();
    }
}