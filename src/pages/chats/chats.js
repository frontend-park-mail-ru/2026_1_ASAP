import { BasePage } from "../../core/base/basePage.js";
import { SearchForm } from "../../components/composite/searchForm/searchForm.js";
import { MenuBar } from "../../components/composite/menuBar/menuBar.js";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper.js";
import { authService } from "../../services/authService.js";
import { Button } from "../../components/ui/button/button.js";

export class ChatsPage extends BasePage {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-page';
        wrapper.innerHTML = `
        <div class="chat-page__sidebar"></div>
        <div class=chat-page__mainfield>
            <p class="empty-field">У вас пока не выбран чат.<br>Скорее напишите кому-нибудь!</p>
        </div>
        `;
        return wrapper;
    };

    toggleSettings() {
        const sidebar = this.element.querySelector('.chat-page__sidebar');
        if (!this.isSettings) {
            this.searchForm.unmount();
            this.chatWrapper.unmount();
            this.menuBar.unmount();
            this.logoutButton = new Button({
                class: 'logout-button',
                label: 'Выйти из аккаунта',
                onClick: async () => {
                    await authService.logout();
                    this.props.router.navigate('/login');
                }
            });
            this.logoutButton.mount(sidebar);
            this.isSettings = true;
        } else {
            this.logoutButton.unmount();
            this.logoutButton = null;
            this.searchForm = new SearchForm();
            this.searchForm.mount(sidebar);
            this.chatWrapper = new ChatListWrapper();
            this.chatWrapper.mount(sidebar);
            this.isSettings = false;
        }
    };

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
        
        this.menuBar = new MenuBar({
            onSettingsClick: () => this.toggleSettings()
        });
        this.menuBar.mount(this.element.querySelector('.chat-page__sidebar'));
    };

    beforeUnmount() {
        if (this.isSettings) {
            this.logoutButton?.unmount();
        } else {
            this.searchForm.unmount();
            this.chatWrapper.unmount();
        }
        this.menuBar.unmount();
    };
}