export class Router {
    constructor(routes, pageManager) {
        this.routes = routes
        this.pageManager = pageManager
    }

    init() {
        window.addEventListener('popstate', () => this.handleRoute());

        this.handleRoute();
    }

    handleRoute() {
        const path = window.location.pathname;
        const PageClass = this.routes[path] || this.routes['404'];
        if (PageClass) {
            this.pageManager.open(PageClass);
        }
    }

    navigate(path) {
        history.pushState({}, '', path);
        this.handleRoute();
    }
}