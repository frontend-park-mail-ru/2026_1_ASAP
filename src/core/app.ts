import { Layout } from "./layout/layout";
import { PageManager } from "./pageManager";
import { Router, PageLoader } from "./router";
import { authService } from "../services/authService";


const routes: Record<string, PageLoader> = {
    '/':         () => import(/* webpackChunkName: "login" */ "../pages/login/login").then(m => m.LoginPage),
    '/login':    () => import(/* webpackChunkName: "login" */ "../pages/login/login").then(m => m.LoginPage),
    '/register': () => import(/* webpackChunkName: "register" */ "../pages/register/register").then(m => m.RegisterPage),
    '/chats':    () => import(/* webpackChunkName: "chats", webpackPrefetch: true */ "../pages/chats/chats").then(m => m.ChatsPage),
    '/contacts': () => import(/* webpackChunkName: "contacts" */ "../pages/contacts/contacts").then(m => m.ContactsPage),
    '/settings': () => import(/* webpackChunkName: "settings" */ "../pages/settings/settings").then(m => m.SettingsPage),
    '/admin':    () => import(/* webpackChunkName: "admin" */ "../pages/adminPage/adminPage").then(m => m.AdminPage),
};

/**
 * @class App
 * @description Главный класс приложения. Отвечает за инициализацию ключевых модулей:
 * `Layout` (основная структура страницы), `Router` (управление URL и маршрутами)
 * и `PageManager` (управление жизненным циклом страниц).
 * Также выполняет первоначальную проверку авторизации и запускает роутинг.
 *
 * @property {Layout} layout - Экземпляр `Layout`, управляющий основной разметкой.
 * @property {Router} router - Экземпляр `Router`, отвечающий за навигацию.
 * @property {PageManager} pageManager - Экземпляр `PageManager`, управляющий страницами.
 */
export class App {
    private layout: Layout;
    public router: Router;
    private pageManager: PageManager;

    constructor() {
        this.layout = new Layout();
        this.router = new Router(routes);
        this.pageManager = new PageManager(this.layout, this.router);
        this.router.pageManager = this.pageManager;
    }

    /**
     * Запускает приложение.
     * В текущей реализации просто выполняет навигацию на текущий URL
     * и инициализирует роутер для прослушивания изменений.
     * (Логика проверки авторизации закомментирована).
     * @returns {Promise<void>}
     */
    async start(): Promise<void> {
        // Если юзер уже залогинен — стартуем WS-соединение и глобальный
        // listener уведомлений (живут пока сессия активна, независимо от страницы).
        if (await authService.checkAuth()) {
            await authService.startSessionServices();
        }

        this.router.init();
    }
}