import { LoginPage } from "../pages/login/login";
import { ChatsPage } from "../pages/chats/chats"; 
import { RegisterPage } from "../pages/register/register";
import { Layout } from "./layout/layout";
import { PageManager } from "./pageManager";
import { Router } from "./router";
import { authService } from "../services/authService";
import { ContactsPage } from "../pages/contacts/contacts";

const routes = {
    '/': LoginPage,
    '/login': LoginPage,
    '/register': RegisterPage,
    '/chats': ChatsPage,
    '/contacts': ContactsPage,
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
        // const isAuth = await authService.checkAuth();

        // if (isAuth) {
        //     this.router.navigate('/chats');
        // } else {
        //     this.router.navigate('/login');
        // }
        this.router.navigate('/chats');

        this.router.init();
    }
}