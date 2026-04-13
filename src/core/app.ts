import { LoginPage } from "../pages/login/login";
import { ChatsPage } from "../pages/chats/chats"; 
import { RegisterPage } from "../pages/register/register";
import { Layout } from "./layout/layout";
import { PageManager } from "./pageManager";
import { Router } from "./router";
import { ContactsPage } from "../pages/contacts/contacts";
import { SettingsPage } from "../pages/settings/settings";
import { authService } from "../services/authService";

const routes = {
    '/': LoginPage,
    '/login': LoginPage,
    '/register': RegisterPage,
    '/chats': ChatsPage,
    '/contacts': ContactsPage,
    '/settings': SettingsPage,
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

        this.router.init();
    }
}