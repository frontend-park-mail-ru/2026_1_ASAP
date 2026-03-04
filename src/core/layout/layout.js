export class Layout {
    constructor() {
        this.root = document.getElementById('app');
    }
    render(content) {
        this.root.innerHTML = `
        <div class="layout">
            <main class="layout__content"></main>
        </div>
        `;
        this.root.querySelector('.layout__content').appendChild(content);
    }
}