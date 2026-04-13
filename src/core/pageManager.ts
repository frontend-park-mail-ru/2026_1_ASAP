import { BasePage } from './base/basePage';
import { Layout } from './layout/layout';
import { Router } from './router';

/**
 * @class PageManager
 * @description Управляет жизненным циклом страниц в приложении.
 * Отвечает за смену страниц: корректно размонтирует старую страницу,
 * создает экземпляр новой и монтирует ее в `Layout`.
 * Также обрабатывает обновление свойств для уже открытой страницы.
 *
 * @property {Layout} layout - Экземпляр `Layout`, в который рендерятся страницы.
 * @property {Router} router - Экземпляр `Router` для передачи в дочерние страницы.
 * @property {BasePage | null} currentPage - Текущая активная страница.
 */
export class PageManager {
    private layout: Layout;
    private router: Router;
    private currentPage: BasePage<any> | null = null;

    /**
     * @param {Layout} layout - Экземпляр лейаута.
     * @param {Router} router - Экземпляр роутера.
     */
    constructor(layout: Layout, router: Router) {
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
    public async open(PageClass: { new(props: any): BasePage<any> }, props: any = {}): Promise<void> {
        const pageProps = {
            ...props,
            pageManager: this,
            router: this.router
        };

        if (this.currentPage && this.currentPage instanceof PageClass) {
            if (this.currentPage.updateProps) {
                await this.currentPage.updateProps(pageProps);
            }
            return;
        }

        const oldPage = this.currentPage;
        this.currentPage = null;

        if (oldPage) {
            await (oldPage as BasePage<any>).unmount();
        }

        const newPage = new PageClass(pageProps);
        this.currentPage = newPage;

        this.layout.render(newPage.root);
        await newPage.mount();
    }
}