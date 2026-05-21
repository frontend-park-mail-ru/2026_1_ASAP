import { LoginPage } from "../pages/login/login";
import { ChatsPage } from "../pages/chats/chats";
import { RegisterPage } from "../pages/register/register";
import { Layout } from "./layout/layout";
import { PageManager } from "./pageManager";
import { Router } from "./router";
import { ContactsPage } from "../pages/contacts/contacts";
import { SettingsPage } from "../pages/settings/settings";
import { AdminPage } from "../pages/adminPage/adminPage";
import { authService } from "../services/authService";
import { wsClient } from "./utils/wsClient";
import { notificationService } from "../services/notificationService";
import { contactService } from "../services/contactService";

const routes = {
    '/': LoginPage,
    '/login': LoginPage,
    '/register': RegisterPage,
    '/chats': ChatsPage,
    '/contacts': ContactsPage,
    '/settings': SettingsPage,
    '/admin': AdminPage,
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
            wsClient.connect();
            try {
                const profile = await contactService.getMyProfile();
                notificationService.attach(profile.additionalInfo.id);
            } catch (e) {
                console.warn('App: не удалось получить профиль для глобальных уведомлений', e);
            }
        }

        this.router.init();
    }
}