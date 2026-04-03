import template from "./chats.hbs";
import { BasePage, IBasePageProps } from "../../core/base/basePage";
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { MenuBar } from "../../components/composite/menuBar/menuBar";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper";
import { authService } from "../../services/authService";
import { Button } from "../../components/ui/button/button";
import { BaseComponent } from "../../core/base/baseComponent";
import { ChatWindow } from "../../components/composite/chatWindow/chatWindow";
import { DialogHeader } from "../../components/composite/dialogHeader/dialogHeader";
import { MessageList } from "../../components/composite/messageList/messageList";
import { MessageInput } from "../../components/ui/messageInput/messageInput";
import { Chat, FrontendMessage, User, DialogChat, GroupChat, ChannelChat } from '../../types/chat';
import { chatService } from "../../services/chatService";
import { GroupHeader } from "../../components/composite/groupHeader/groupHeader";
import { ChannelHeader } from "../../components/composite/channelHeader/channelHeader";
import { CreateDialogWindow } from "../../components/composite/createDialogWindow/createDialogWindow"; 
import { CreateGroupWindow } from "../../components/composite/createGroupWindow/createGroupWindow";

const CURRENT_USER_LOGIN = 'alice'; 
const CURRENT_USER: User = { login: CURRENT_USER_LOGIN, avatarUrl: '/assets/images/avatars/myAvatar.svg' };

interface ChatsPageProps extends IBasePageProps {
    currentPath?: string; 
}

export class ChatsPage extends BasePage<ChatsPageProps> {
    private searchForm: SearchForm | null = null;
    private chatWrapper: ChatListWrapper | null = null;
    private menuBar: MenuBar | null = null;
    private logoutButton: Button | null = null;
    private logoutWrapper: HTMLDivElement | null = null;
    private activeMenuButton: string | null = null;
    
    private chatWindow: ChatWindow | null = null;
    private createChatWindow: BaseComponent | null = null;
    
    public activeChatId: string | null = null;
    private mainContentArea: HTMLElement | null = null;
    private placeholderElement: HTMLElement | null = null; 

    constructor(props: ChatsPageProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    };

    async afterMount() {
        if (!this.element) return;

        this.activeMenuButton = "messages";
        
        // Инициализация сайдбара
        this.searchForm = new SearchForm({ router: this.props.router });
        this.searchForm.mount(this.element.querySelector('.chat-page__sidebar')!);

        this.chatWrapper = new ChatListWrapper( { 
            router: this.props.router,
            activeChatId: this.activeChatId,
        });
        this.chatWrapper.mount(this.element.querySelector('.chat-page__sidebar')!);

        this.logoutWrapper = document.createElement('div');
        this.logoutWrapper.style.flex = '1';
        this.logoutWrapper.style.display = 'none';
        this.logoutWrapper.style.alignItems = 'center';
        this.logoutWrapper.style.justifyContent = 'center';
        this.element.querySelector('.chat-page__sidebar')!.appendChild(this.logoutWrapper);

        this.menuBar = new MenuBar({
            onSettingsClick: () => this.toggleSettings(),
            onMessagesClick: () => this.toggleMessages(),
            onContactsClick: () => this.toggleContacts(),
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
        this.placeholderElement = this.mainContentArea?.querySelector('.empty-field') || null;
        
        await this.handleChatRoute();
    }

    public async updateProps(newProps: ChatsPageProps): Promise<void> {
        this.props = { ...this.props, ...newProps };
        await this.handleChatRoute();
    }

    /**
     * Универсальный метод очистки правой панели. 
     * Гарантирует, что у нас не будет утечек памяти и наложений интерфейса.
     */
    private cleanupMainContent(): void {
        if (this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
        }
        if (this.createChatWindow) {
            this.createChatWindow.unmount();
            this.createChatWindow = null;
        }
        if (this.placeholderElement) {
            this.placeholderElement.style.display = 'none';
        }
    }

    /**
     * Логика роутинга внутри страницы чатов.
     */
    private async handleChatRoute(): Promise<void> {
        const path = this.props.currentPath || window.location.pathname;
        const pathParts = path.split('/');
        const lastParam = pathParts[pathParts.length - 1];

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastParam);

        // Корень чатов (показываем плейсхолдер)
        if (path === '/chats') {
            this.cleanupMainContent();
            this.activeChatId = null;
            this.chatWrapper?.setActiveChat(null);
            
            if (this.placeholderElement) {
                this.placeholderElement.style.display = 'block';
            }
            return;
        }

        // Открытие существующего чата по UUID
        if (isUUID) {
            if (lastParam !== this.activeChatId || !this.chatWindow) {
                this.cleanupMainContent();
                
                this.activeChatId = lastParam;
                this.chatWrapper?.setActiveChat(lastParam);
                await this.openChat(lastParam);
            }
            return;
        }
        
        // Создание нового чата
        if (path.startsWith('/chats/create-')) {
            this.cleanupMainContent();
            
            this.activeChatId = null;
            this.chatWrapper?.setActiveChat(null);
            
            const chatType = path.replace('/chats/create-', ''); 
            this.createChat(chatType);
            return;
        }
    }

    /**
     * Рендерит нужное окно создания чата.
     */
    private createChat(type: string) {
        if (!this.mainContentArea) return;

        switch (type) {
            case 'dialog':
                this.createChatWindow = new CreateDialogWindow({ router: this.props.router });
                break;
            case 'group':
                this.createChatWindow = new CreateGroupWindow({ router: this.props.router });
                break;
            case 'channel':
                // TODO: Реализовать CreateChannelWindow и раскомментировать эту строку
                // this.createChatWindow = new CreateChannelWindow({ router: this.props.router });
                console.log("Рендерим компонент создания канала");
                return;
            default:
                console.error("ChatsPage: Неизвестный тип создаваемого чата:", type);
                return;
        }

        if (this.createChatWindow) {
            this.createChatWindow.mount(this.mainContentArea);
        }
    }

    private async openChat(chatId: string): Promise<void> {
        if (!this.mainContentArea) return;

        const chatDetail = await chatService.getChatDetail(chatId);
        const messages = await chatService.getMessages(chatId, CURRENT_USER_LOGIN);

        if (!chatDetail) {
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
                headerComponent = new BaseComponent({ title: (chatDetail as Chat).title });
        }

        const messageListComponent = new MessageList({ 
            messages: messages, 
            currentUser: CURRENT_USER,
            chatType: chatDetail.type
        });  

        const messageInputComponent = new MessageInput({
            onSubmit: (text: string) => {
                //todo : отправка сообщения в чат
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

        if (this.activeMenuButton === "settings") return;
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
        this.activeMenuButton = "settings";
    }

    toggleMessages() {
        if (this.activeMenuButton === "messages") return;
        this.menuBar?.setActiveButton('messages');
        if (this.searchForm?.element) this.searchForm.element.style.visibility = '';
        if (this.chatWrapper?.element) this.chatWrapper.element.style.display = '';
        if (this.logoutWrapper) this.logoutWrapper.style.display = 'none';
        this.activeMenuButton = "messages";
    }

    toggleContacts() {
        this.props.router.navigate('/contacts');
    };

    beforeUnmount() {
        this.cleanupMainContent();
        this.logoutWrapper?.remove();
        this.searchForm?.unmount();
        this.chatWrapper?.unmount();
        this.menuBar?.unmount();
        this.logoutButton?.unmount();
        
        this.activeChatId = null;
        this.placeholderElement = null; 
    }
}