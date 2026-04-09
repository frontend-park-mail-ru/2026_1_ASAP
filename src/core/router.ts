import { BasePage } from "./base/basePage";
import { PageManager } from "./pageManager";
import { authService } from "../services/authService";

/**
 * Клиентский роутер. Обрабатывает навигацию через History API
 * и делегирует открытие страниц в PageManager.
 */

const protectedRoutes = ['/chats'];

export class Router {
    
    private routes: { [key: string]: typeof BasePage };
    public pageManager: PageManager | null = null;

    /**
     * @param {Object<string, typeof BasePage>} routes - Маршруты.
     */
    constructor(routes: { [key: string]: any }) { 
        /** @type {Object<string, typeof BasePage>} */
        this.routes = routes;

        /** @type {import PageManager|null} */
        this.pageManager = null;
    }

    /**
     * Инициализирует роутер: подписывается на popstate и обрабатывает текущий маршрут.
     */
    public init() {
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    }

    /**
     * Определяет текущий маршрут и открывает соответствующую страницу.
     * @returns {Promise<void>}
     * @throws {Error} Если PageManager не установлен.
     */
    public async handleRoute(): Promise<void> {
        if (!this.pageManager) {
            throw new Error("PageManager не установлен в Router");
        }

        const path = window.location.pathname;
        
        const isAuth = await authService.checkAuth();
        const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

        if (isProtectedRoute && !isAuth) {
            this.navigate('/login');
            return;
        }

        if (!isProtectedRoute && isAuth && (path === '/login' || path === '/register' || path === '/')) {
            this.navigate('/chats');
            return;
        }
        
        let PageClass: typeof BasePage | null = null;



        if (path.startsWith('/chats/') || path === '/chats') {
            PageClass = this.routes['/chats'];
        } else if (path.startsWith('/contacts/') || path === '/contacts') {
            PageClass = this.routes['/contacts'];
        } else if (path.startsWith('/settings/') || path === '/settings') {
            PageClass = this.routes['/settings'];
        } else {
            PageClass = this.routes[path] || this.routes['/'];
        }

        if (PageClass) {
            await this.pageManager.open(PageClass, { currentPath: path });
        }
    }

    /**
     * Выполняет навигацию на указанный путь.
     * @param {string} path - URL-путь (например, '/chats').
     */
    public navigate(path: string): void {
        if (window.location.pathname === path) {
            this.handleRoute();
            return;
        }
        history.pushState({}, '', path);
        this.handleRoute();
    }
}