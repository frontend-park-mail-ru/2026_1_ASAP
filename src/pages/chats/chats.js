import { BasePage } from "../../core/base/basePage.js";
import { SearchForm } from "../../components/composite/searchForm/searchForm.js";
import { MenuBar } from "../../components/composite/menuBar/menuBar.js";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper.js";
import { authService } from "../../services/authService.js";

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

    async afterMount() {
        const isAuth = await authService.checkAuth();
        if (!isAuth) {
            this.props.router.navigate('/login');
            return;
        }

        this.searchForm = new SearchForm();
        this.searchForm.mount(this.element.querySelector('.chat-page__sidebar'));

        this.chatWrapper = new ChatListWrapper();
        this.chatWrapper.mount(this.element.querySelector('.chat-page__sidebar'));
        
        this.menuBar = new MenuBar();
        this.menuBar.mount(this.element.querySelector('.chat-page__sidebar'));
    };

    beforeUnmount() {
        this.searchForm.unmount();
        this.chatWrapper.unmount();
        this.menuBar.unmount();
    };
}