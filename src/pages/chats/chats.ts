import { BasePage } from "../../core/base/basePage.js";
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
import { Chat, Message as MessageType, User } from '../../types/chat.js';
import { chatService } from "../../services/chatService.js";
import { DialogChat, GroupChat, ChannelChat } from '../../types/chat.js'; 
import { GroupHeader } from "../../components/composite/groupHeader/groupHeader.js";
import { ChannelHeader } from "../../components/composite/channelHeader/channelHeader.js";
const CURRENT_USER: User = { id: 1, login: 'currentuser', avatarUrl: '/assets/images/avatars/myAvatar.svg' };

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
    private activeChatId: number | null = null;
    private mainContentArea: HTMLElement | null = null;

    constructor(props: any = {}) {
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
        if (!this.element) {return;}
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

        this.mainContentArea = this.element.querySelector('.chat-page__main-view');

        this.handleChatRoute();
    }

    /**
     * Обрабатывает изменение маршрута для отображения нужного чата.
     */
    private async handleChatRoute(): Promise<void> {
        const pathParts = window.location.pathname.split('/');
        const chatIdParam = pathParts[pathParts.length - 1];

        const newChatId = parseInt(chatIdParam, 10);

        if (!isNaN(newChatId) && newChatId !== this.activeChatId) {
            this.activeChatId = newChatId;
            await this.openChat(newChatId);
        } else if (isNaN(newChatId) && this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
            this.activeChatId = null;
        }
    }


    /**
     * Открывает конкретный чат в основной области.
     * @param {number} chatId - ID чата для открытия.
     */
    private async openChat(chatId: number): Promise<void> {
        if (!this.mainContentArea) return;

        if (this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
        }

        const chatDetail = await chatService.getChatDetail(chatId);
        const messages = await chatService.getMessages(chatId);

        if (!chatDetail) {
            console.error(`Чат с ID ${chatId} не найден.`);
            this.props.router.navigate('/chats');
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

        const messageListComponent = new MessageList({ messages: messages, currentUser: CURRENT_USER });
        const messageInputComponent = new MessageInput({
            onSubmit: (text: string) => {
                console.log(`Отправка сообщения в чат ${chatId}: ${text}`);
                // TODO: Здесь будет вызов WebSocketService
                const newMessage: MessageType = {
                    id: messages.length + 1, // Временный ID
                    sender: CURRENT_USER,
                    text: text,
                    timestamp: new Date(),
                    isOwn: true,
                    status: 'sent'
                };
                messageListComponent.addMessage(newMessage);
            }
        });

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
    }
}