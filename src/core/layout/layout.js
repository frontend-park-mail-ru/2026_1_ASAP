import { loadTemplate } from "../templateLoader.js";

export class Layout {
    constructor() {
        this.root = document.getElementById('app');
        this.tempPath = '/core/layout/layout.hbs';
        this.temp = null;
    }
    async render(content) {
        if (!this.tempPath) {
            throw new Error(`tempPath не указан для layout ${this.constructor.name}`);
        }

        if (!this.temp) {
            const modulePath = this.tempPath.replace('.hbs', '.precompiled.js');
            this.temp = await loadTemplate(modulePath);
        }

        const htmlString = await this.temp({});
        this.root.innerHTML = htmlString;
        
        this.root.querySelector('.layout__content').appendChild(content);
    }
}
