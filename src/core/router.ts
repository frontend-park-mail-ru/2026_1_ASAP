import { BasePage, IBasePageProps } from "./base/basePage";
import { PageManager } from "./pageManager";
import { authService } from "../services/authService";
import { contactService } from "../services/contactService";

/**
 * Клиентский роутер. Обрабатывает навигацию через History API
 * и делегирует открытие страниц в PageManager.
 */

const protectedRoutes = ['/chats', '/settings', '/admin', '/payment'];
const adminOnlyRoutes = ['/admin'];
export type PageConstructor = new (props?: IBasePageProps) => BasePage<IBasePageProps>;
/** Loader: ленивая загрузка модуля страницы (code-splitting). */
export type PageLoader = () => Promise<PageConstructor>;
const paymentReturnRoute = '/payment/return';

export class Router {

    private routes: { [key: string]: PageLoader };
    public pageManager: PageManager | null = null;

    /**
     * @param {Object<string, PageLoader>} routes - Маршруты с lazy-загружаемыми страницами.
     */
    constructor(routes: { [key: string]: PageLoader }) {
        this.routes = routes;
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
     * @throws {Error} Если `pageManager` не был установлен.
     */
    public async handleRoute(): Promise<void> {
        if (!this.pageManager) {
            throw new Error("PageManager не установлен в Router");
        }

        const path = window.location.pathname;

        const isAuth = await authService.checkAuth();
        const isProtectedRoute = protectedRoutes.some(route => path === route || path.startsWith(route + '/'));
        const isOffline = !navigator.onLine;

        if (isProtectedRoute && !isAuth && !isOffline) {
            this.navigate('/login');
            return;
        }

        if (isAuth && path === paymentReturnRoute) {
            const params = new URLSearchParams(window.location.search);
            params.set('payment_return', '1');
            const query = params.toString();
            history.replaceState({}, '', `/settings/subscription${query ? `?${query}` : ''}`);
            await this.handleRoute();
            return;
        }

        // Защита маршрутов только для админа
        if (isAuth && adminOnlyRoutes.some(r => path.startsWith(r))) {
            const isAdmin = await contactService.isAdmin();
            if (!isAdmin) {
                this.navigate('/chats');
                return;
            }
        }

        // Редирект авторизованного пользователя с login/register на нужную страницу
        if (!isProtectedRoute && isAuth && (path === '/login' || path === '/register' || path === '/')) {
            const isAdmin = await contactService.isAdmin();
            this.navigate(isAdmin ? '/admin' : '/chats');
            return;
        }

        let loader: PageLoader | null = null;

        if (path.startsWith('/chats/') || path === '/chats') {
            loader = this.routes['/chats'];
        } else if (path.startsWith('/contacts/') || path === '/contacts') {
            loader = this.routes['/contacts'];
        } else if (path.startsWith('/settings/') || path === '/settings') {
            loader = this.routes['/settings'];
        } else if (path.startsWith('/admin') || path === '/admin') {
            loader = this.routes['/admin'];
        } else {
            loader = this.routes[path] ?? null;
        }

        if (loader) {
            const PageClass = await loader();
            await this.pageManager.open(PageClass, { currentPath: path });
        } else {
            this.navigate(isAuth ? '/chats' : '/login');
        }
    }

    /**
     * Осуществляет программную навигацию на новый URL.
     * Обновляет URL в адресной строке с помощью `history.pushState` и вызывает `handleRoute`
     * для отображения новой страницы.
     * @param {string} path - Путь для навигации (например, '/chats').
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
