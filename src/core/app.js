import { loginPage } from "../components/pages/login/login.js";

export class App {
    constructor() {
        this.root = document.getElementById('app');
        this.currentPage = null;
    }

    init() {
        this.showLoginPage();
    }

    async showLoginPage() {
        const page = new loginPage();
        await this.switchPage(page);
    }

    async switchPage(pageInstance) {
        if (this.currentPage) {
            this.currentPage.unmount();
        }
        this.currentPage = pageInstance;

        await this.currentPage.mount(this.root);
    }
}
