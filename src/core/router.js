export class Router {
    constructor(routes) {
        this.routes = routes
        this.pageManager = null;
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

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

    navigate(path) {
        history.pushState({}, '', path);
        this.handleRoute();
    }
}