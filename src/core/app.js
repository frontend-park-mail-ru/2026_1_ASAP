import { LoginPage } from "../pages/login/login.js";
import { ChatsPage } from "../pages/chats/chats.js";
import { Layout } from "./layout/layout.js";
import { PageManager } from "./pageManager.js";
import { Router } from "./router.js";

const routes = {
    '/': LoginPage,
    '/login': LoginPage,
    '/chats': ChatsPage,
}

export class App {
    constructor() {
        this.layout = new Layout();
        this.pageManager = new PageManager(this.layout);
        this.router = new Router(routes, this.pageManager)
    }
    start() {
        this.router.init();
    }
}
