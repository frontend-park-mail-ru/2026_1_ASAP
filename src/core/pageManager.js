export class PageManager {
    constructor(layout) {
        this.layout = layout;
        this.currentPage = null;
    }
    open(PageClass, props = {}) {
        if (this.currentPage) {
            this.currentPage.unmount();
        }
        const page = new PageClass({
            ...props,
            pageManager: this
        });
        this.currentPage = page;

        this.layout.render(page.root);
        page.mount();
    }
}