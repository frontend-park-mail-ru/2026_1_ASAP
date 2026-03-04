import {loginPage} from "../pages/login/login.js";
import {Layout} from "./layout/layout.js";
import {PageManager} from "./pageManager.js";
export class App {
    constructor() {
        this.layout = new Layout();
        this.pageManager = new PageManager(this.layout);
    }
    start() {
        this.pageManager.open(loginPage);
    }
}
