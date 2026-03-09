export class PageManager {
    constructor(layout, router) {
        this.layout = layout;
        this.router = router;
        this.currentPage = null;
    }
    open(PageClass, props = {}) {
        if (this.currentPage) {
            this.currentPage.unmount();
        }
        const pageProps = {
            ...props,
            pageManager: this,
            router: this.router
        };
        const page = new PageClass(pageProps);

        this.currentPage = page;

        this.layout.render(page.root);
        page.mount();
    }
}