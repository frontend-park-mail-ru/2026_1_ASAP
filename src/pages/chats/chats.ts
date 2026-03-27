import { BasePage, IBasePageProps } from "../../core/base/basePage.js";
import { SearchForm } from "../../components/composite/searchForm/searchForm.js";
import { MenuBar } from "../../components/composite/menuBar/menuBar.js";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper.js";
import { authService } from "../../services/authService.js";
import { Button } from "../../components/ui/button/button.js";
import { BaseComponent } from "../../core/base/baseComponent.js";
import { ChatWindow } from "../../components/composite/chatWindow/chatWindow.js";
import { DialogHeader } from "../../components/composite/dialogHeader/dialogHeader.js";
import { MessageList } from "../../components/composite/messageList/messageList.js";
import { MessageInput } from "../../components/ui/messageInput/messageInput.js";
import { Chat, FrontendMessage, User, DialogChat, GroupChat, ChannelChat } from '../../types/chat.js';
import { chatService } from "../../services/chatService.js";
import { GroupHeader } from "../../components/composite/groupHeader/groupHeader.js";
import { ChannelHeader } from "../../components/composite/channelHeader/channelHeader.js";

const CURRENT_USER_LOGIN = 'alice'; // Заглушка для теста, убрать после интеграции с реальными чатами
const CURRENT_USER: User = { login: CURRENT_USER_LOGIN, avatarUrl: '/assets/images/avatars/myAvatar.svg' };


interface ChatsPageProps extends IBasePageProps {
    currentPath?: string; 
}

/**
 * Страница чатов. Содержит боковую панель со списком чатов,
 * поиском, меню и основное поле для сообщений.
 */
export class ChatsPage extends BasePage {
    private searchForm: SearchForm | null = null;
    private chatWrapper: ChatListWrapper | null = null;
    private menuBar: MenuBar | null = null;
    private logoutButton: Button | null = null;
    private logoutWrapper: HTMLDivElement | null = null;
    private isSettings: boolean = false;
    private chatWindow: ChatWindow | null = null;
    private activeChatId: string | null = null;
    private mainContentArea: HTMLElement | null = null;
    private placeholderElement: HTMLElement | null = null; 

    constructor(props: ChatsPageProps = {}) {
        super(props);
        this.tempName = "pages/chats/chats";
    }

    /**
     * @override
     */
    async afterMount() {
        const isAuth = await authService.checkAuth();

        if (!isAuth) {
            this.props.router.navigate('/login');
            return;
        }
        if (!this.element) {
            console.error("ChatsPage: элемент не найден.");
            return;
        }

        this.isSettings = false;
        this.searchForm = new SearchForm();
        this.searchForm.mount(this.element.querySelector('.chat-page__sidebar')!);
        this.chatWrapper = new ChatListWrapper( { router: this.props.router });
        this.chatWrapper.mount(this.element.querySelector('.chat-page__sidebar')!);
        this.logoutWrapper = document.createElement('div');
        this.logoutWrapper.style.flex = '1';
        this.logoutWrapper.style.display = 'none';
        this.logoutWrapper.style.alignItems = 'center';
        this.logoutWrapper.style.justifyContent = 'center';
        this.element.querySelector('.chat-page__sidebar')!.appendChild(this.logoutWrapper);

        this.menuBar = new MenuBar({
            onSettingsClick: () => this.toggleSettings(),
            onMessagesClick: () => this.toggleMessages()
        });
        this.menuBar.mount(this.element.querySelector('.chat-page__sidebar')!);

        this.logoutButton = new Button({
            class: 'logout-button',
            label: 'Выйти из аккаунта',
            onClick: async () => {
                await authService.logout();
                this.props.router.navigate('/login');
            }
        });
        this.logoutButton.mount(this.logoutWrapper);

        this.mainContentArea = this.element.querySelector('.chat-page__mainfield') || null;
        if (!this.mainContentArea) {
            console.error("ChatsPage: Main content area (.chat-page__mainfield) not found.");
            return;
        }

        this.placeholderElement = this.mainContentArea.querySelector('.empty-field') || null;
        if (!this.activeChatId && this.placeholderElement) {
            this.placeholderElement.style.display = 'block';
        }
        
        await this.handleChatRoute();
    }

    /**
     * Метод для обновления свойств страницы (например, при смене ID чата в URL).
     * @param {ChatsPageProps} newProps - Новые свойства.
     */
    public async updateProps(newProps: ChatsPageProps): Promise<void> {
        this.props = { ...this.props, ...newProps };
        await this.handleChatRoute();
    }


    /**
     * Обрабатывает изменение маршрута для отображения нужного чата.
     */
    private async handleChatRoute(): Promise<void> {
        const path = this.props.currentPath || window.location.pathname;
        const pathParts = path.split('/');
        const chatIdParam = pathParts[pathParts.length - 1];

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatIdParam);

        if (isUUID && chatIdParam !== this.activeChatId) {
            this.activeChatId = chatIdParam;
            await this.openChat(chatIdParam);

        } else if (!isUUID && this.activeChatId) {
            this.chatWindow?.unmount();
            this.chatWindow = null;
            this.activeChatId = null;

            if (path !== '/chats') {
                this.props.router?.navigate('/chats');
            }

        } else if (path === '/chats' && !this.activeChatId && this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
        } else if (path === '/chats' && !this.activeChatId && !this.chatWindow && this.placeholderElement) {
            this.placeholderElement.style.display = 'block';        }
    }


    /**
     * Открывает конкретный чат в основной области.
     * @param {string} chatId - ID чата для открытия.
     */
    
    private async openChat(chatId: string): Promise<void> {
        if (!this.mainContentArea) {
            console.error("ChatsPage: mainContentArea не найден.");
            return;
        }

        if (this.placeholderElement) {
            this.placeholderElement.style.display = 'none';
        }

        if (this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
        }

        const chatDetail = await chatService.getChatDetail(chatId);
        const messages = await chatService.getMessages(chatId, CURRENT_USER_LOGIN);

        if (!chatDetail) {
            console.error(`Чат с ID ${chatId} не найден.`);
            this.props.router.navigate('/chats');

            if (this.placeholderElement) {
                this.placeholderElement.style.display = 'block';
            }
            return;
        }

        let headerComponent: BaseComponent;
        switch (chatDetail.type) {
        case 'dialog':
            headerComponent = new DialogHeader({ chat: chatDetail as DialogChat });
            break;
        case 'group':
            headerComponent = new GroupHeader({ chat: chatDetail as GroupChat });
            break;
        case 'channel':
            headerComponent = new ChannelHeader({ chat: chatDetail as ChannelChat });
            break;
        default:
            console.warn(`Неизвестный тип чата:`, chatDetail);
            const curentChatDetail = chatDetail as Chat;
            const fallbackHeader = new BaseComponent({ title: curentChatDetail.title });
            fallbackHeader.render = () => {
                const el = document.createElement('div');
                el.textContent = `Неизвестный чат: ${fallbackHeader.props.title}`;
                return el;
            };
            headerComponent = fallbackHeader;
        }

        const messageListComponent = new MessageList({ 
            messages: messages, 
            currentUser: CURRENT_USER,
            chatType: chatDetail.type
        });  //Убрать заглушку CURRENT_USER после интеграции с реальными чатами
        const messageInputComponent = new MessageInput({
            onSubmit: (text: string) => {
                // todo логика отправки сообщения
             } });

        this.chatWindow = new ChatWindow({
            headerComponent: headerComponent,
            messageListComponent: messageListComponent,
            inputComponent: messageInputComponent
        });
        this.chatWindow.mount(this.mainContentArea);
    }

    toggleSettings() {
        if (!this.element) {return;}

        if (this.isSettings) return;
        this.menuBar?.setActiveButton('settings');
        if (this.searchForm?.element) this.searchForm.element.style.visibility = 'hidden';
        if (this.logoutWrapper) {
            const sidebar = this.element.querySelector('.chat-page__sidebar');
            if (sidebar && this.chatWrapper?.element) {
                sidebar.insertBefore(this.logoutWrapper, this.chatWrapper.element);
            }
            if (this.chatWrapper?.element) this.chatWrapper.element.style.display = 'none';
            this.logoutWrapper.style.display = 'flex';
        }
        this.isSettings = true;
    }

    toggleMessages() {
        if (!this.isSettings) return;
        this.menuBar?.setActiveButton('messages');
        if (this.searchForm?.element) this.searchForm.element.style.visibility = '';
        if (this.chatWrapper?.element) this.chatWrapper.element.style.display = '';
        if (this.logoutWrapper) this.logoutWrapper.style.display = 'none';
        this.isSettings = false;
    }

    /**
     * @override
     */
    beforeUnmount() {
        this.logoutWrapper?.remove();
        this.searchForm?.unmount();
        this.chatWrapper?.unmount();
        this.menuBar?.unmount();
        this.logoutButton?.unmount();
        this.chatWindow?.unmount();
        this.activeChatId = null;
        this.placeholderElement = null; 
    }
}