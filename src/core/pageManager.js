export class PageManager {
    constructor(layout, router) {
        this.layout = layout;
        this.router = router;
        this.currentPage = null;
    }
    
    async open(PageClass, props = {}) {
        if (this.currentPage) {
            await this.currentPage.unmount();
        }
        const pageProps = {
            ...props,
            pageManager: this,
            router: this.router
        };
        const page = new PageClass(pageProps);

        this.currentPage = page;

        await this.layout.render(page.root);
        await page.mount();
    }
}