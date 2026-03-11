import { LoginPage } from "../pages/login/login.js";
import { ChatsPage } from "../pages/chats/chats.js";
import { RegisterPage } from "../pages/register/register.js";
import { Layout } from "./layout/layout.js";
import { PageManager } from "./pageManager.js";
import { Router } from "./router.js";
import { authService } from "../services/authService.js";

const routes = {
    '/': LoginPage,
    '/login': LoginPage,
    '/register': RegisterPage,
    '/chats': ChatsPage,
};

export class App {
    constructor() {
        this.layout = new Layout();
        this.router = new Router(routes); 
        this.pageManager = new PageManager(this.layout, this.router);
        this.router.pageManager = this.pageManager;
    }
    
    async start() {
        const isAuth = await authService.checkAuth();

        if (isAuth) {
            this.router.navigate('/chats');
        } else {
            this.router.navigate('/login');
        }

        window.addEventListener('popstate', () => this.router.handleRoute());
    }
}