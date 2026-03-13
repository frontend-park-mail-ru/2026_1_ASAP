import { BasePage } from "../../core/base/basePage.js";
import { SearchForm } from "../../components/composite/searchForm/searchForm.js";
import { MenuBar } from "../../components/composite/menuBar/menuBar.js";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper.js";
import { authService } from "../../services/authService.js";
import { Button } from "../../components/ui/button/button.js";

/**
 * Страница чатов. Содержит боковую панель со списком чатов,
 * поиском, меню и основное поле для сообщений.
 */
export class ChatsPage extends BasePage {
    /**
     * Создаёт DOM-структуру страницы без шаблона.
     * @returns {HTMLDivElement}
     */
    constructor(props={}) {
        super(props);
        this.tempName = "pages/chats/chats";
    };

    /**
     * Переключает боковую панель между списком чатов и экраном настроек.
     *
     * При открытии настроек — размонтирует {@link SearchForm}, {@link ChatListWrapper},
     * {@link MenuBar} и показывает кнопку «Выйти из аккаунта».
     * При закрытии — убирает кнопку и восстанавливает список чатов с поиском.
     */
    toggleSettings() {
        if (!this.isSettings) {
            this.searchForm.element.style.visibility = 'hidden';
            this.chatWrapper.element.style.visibility = 'hidden';
            this.logoutButton.element.style.display = 'block';
            this.isSettings = true;
        } else {
            this.searchForm.element.style.visibility = '';
            this.chatWrapper.element.style.visibility = '';
            this.logoutButton.element.style.display = 'none';
            this.isSettings = false;
        }
    };

    /**
     * Проверяет авторизацию и монтирует компоненты боковой панели.
     * @returns {Promise<void>}
     * @protected
     */
    async afterMount() {
        const isAuth = await authService.checkAuth();
        if (!isAuth) {
            this.props.router.navigate('/login');
            return;
        }
        this.isSettings = false;
        this.logoutButton = null;

        this.searchForm = new SearchForm();
        this.searchForm.mount(this.element.querySelector('.chat-page__sidebar'));

        this.chatWrapper = new ChatListWrapper();
        this.chatWrapper.mount(this.element.querySelector('.chat-page__sidebar'));

        this.logoutButton = new Button({
            class: 'logout-button',
            label: 'Выйти из аккаунта',
            onClick: async () => {
                await authService.logout();
                this.props.router.navigate('/login');
            }
        });
        this.logoutButton.mount(this.element.querySelector('.chat-page__sidebar'));
        this.logoutButton.element.style.display = 'none';
        
        this.menuBar = new MenuBar({
            onSettingsClick: () => this.toggleSettings()
        });
        this.menuBar.mount(this.element.querySelector('.chat-page__sidebar'));
    };


    /**
     * Размонтирует дочерние компоненты и удаляет обработчик клика.
     */
    beforeUnmount() {
        this.logoutButton?.unmount();
        this.searchForm.unmount();
        this.chatWrapper.unmount();
        this.menuBar.unmount();
    };
}