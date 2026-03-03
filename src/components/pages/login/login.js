import { loadTemplate } from '../../../core/templateLoader.js';

export class loginPage {
    constructor() {
        this.tempPath = "/components/pages/login/login.handlebars";
        this.root = null;
        this.temp = null;
    }

    async render() {
        if (!this.temp) {
            this.temp = await loadTemplate(this.tempPath);
        }
        console.log('Generated HTML:', this.temp({
            "title": "Вход"
        })
        );

        return this.temp({
            "title": "Вход"
        });
    }

    async mount(rootElement) {
        console.log('Mount called');

        this.root = rootElement;
        const html = await this.render();
        this.root.innerHTML = html;
    }

    unmount() {
        if (this.root) {
            this.root.innerHTML = '';
        }
    }
}