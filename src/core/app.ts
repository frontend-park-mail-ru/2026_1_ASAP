import { LoginPage } from "../pages/login/login";
import { ChatsPage } from "../pages/chats/chats"; 
import { RegisterPage } from "../pages/register/register";
import { Layout } from "./layout/layout";
import { PageManager } from "./pageManager";
import { Router } from "./router";
import { authService } from "../services/authService";
import { ContactsPage } from "../pages/contacts/contacts";
import { SettingsPage } from "../pages/settings/settings";

const routes = {
    '/': LoginPage,
    '/login': LoginPage,
    '/register': RegisterPage,
    '/chats': ChatsPage,
    '/contacts': ContactsPage,
    '/settings': SettingsPage,
};

/**
 * Главный класс приложения. Инициализирует Layout, Router и PageManager,
 * проверяет авторизацию и запускает роутинг.
 */
export class App {
    private layout: Layout;
    private router: Router;
    private pageManager: PageManager;

    constructor() {
        this.layout = new Layout();
        this.router = new Router(routes);
        this.pageManager = new PageManager(this.layout, this.router);
        this.router.pageManager = this.pageManager;
    }

    /**
     * Запускает приложение: проверяет авторизацию и выполняет начальную навигацию.
     * @returns {Promise<void>}
     */
    async start(): Promise<void> {
        const isAuth = await authService.checkAuth();
        const currentPath = window.location.pathname;

        if (isAuth) {
            const protectedPaths = ['/', '/login', '/register'];
            const targetPath = protectedPaths.includes(currentPath) ? '/chats' : currentPath;
            this.router.navigate(targetPath);
        } else {
            this.router.navigate('/login');
        }


        this.router.init();
    }
}