/**
 * Управляет переключением страниц: размонтирует текущую,
 * создаёт новую и рендерит её через Layout.
 */
export class PageManager {
    /**
     * @param {import Layout} layout - Экземпляр лейаута.
     * @param {import Router} router - Экземпляр роутера.
     */
    constructor(layout, router) {
        this.layout = layout;
        this.router = router;
        this.currentPage = null;
    }
    
    /**
     * Открывает страницу: размонтирует предыдущую, создаёт новую и монтирует.
     * @param {typeof BasePage} PageClass - Класс страницы.
     * @param {object} [props={}] - Дополнительные свойства для страницы.
     * @returns {Promise<void>}
     */
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