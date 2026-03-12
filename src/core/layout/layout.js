export class Layout {
    constructor() {
        this.root = document.getElementById('app');
        this.tempName = 'core/layout/layout';
    }

    render(content) {
        const template = Handlebars.templates[this.tempName];
        if (!template) {
            throw new Error(`Шаблон ${this.tempName} не найден`);
        }

        this.root.innerHTML = template({});
        this.root.querySelector('.layout__content').appendChild(content);
    }
}
