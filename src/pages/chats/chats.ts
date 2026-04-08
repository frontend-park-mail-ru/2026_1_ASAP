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
import { contactService } from "../../services/contactService";

const CURRENT_USER_LOGIN = 'alice'; 
const CURRENT_USER: User = { login: CURRENT_USER_LOGIN, avatarUrl: '/assets/images/avatars/myAvatar.svg' };

/**
 * @interface ChatsPageProps
 * @description Свойства для компонента страницы чатов.
 * @extends IBasePageProps
 * @property {string} [currentPath] - Текущий путь URL для внутреннего роутинга.
 */
interface ChatsPageProps extends IBasePageProps {
    currentPath?: string; 
}

/**
 * @class ChatsPage
 * @extends BasePage
 * @description Основная страница приложения, отображающая интерфейс чатов.
 * Управляет левой панелью (список чатов, поиск, меню) и правой панелью
 * (окно чата, плейсхолдер или окна создания чатов).
 * Реализует внутреннюю логику навигации по чатам.
 *
 * @property {SearchForm | null} searchForm - Компонент поиска.
 * @property {ChatListWrapper | null} chatWrapper - Обертка для списка чатов.
 * @property {MenuBar | null} menuBar - Нижнее меню навигации.
 * @property {ChatWindow | null} chatWindow - Окно активного чата.
 * @property {BaseComponent | null} createChatWindow - Окно создания нового чата.
 * @property {string | null} activeChatId - ID текущего открытого чата.
 */
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

    /**
     * Выполняется после монтирования страницы.
     * Инициализирует все компоненты сайдбара и основную контентную область.
     * Запускает внутренний роутер для отображения нужного контента.
     * @protected
     */
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
            onSettingsClick: () => this.props.router.navigate('/settings'),
            onMessagesClick: () => this.props.router.navigate('/chats'),
            onContactsClick: () => this.props.router.navigate('/contacts'),
        });
        this.menuBar.mount(this.element.querySelector('.chat-page__sidebar')!);

        this.mainContentArea = this.element.querySelector('.chat-page__mainfield') || null;
        this.placeholderElement = this.mainContentArea?.querySelector('.empty-field') || null;
        
        await this.handleChatRoute();
    }

    /**
     * Обновляет свойства компонента и перезапускает внутренний роутер
     * для отображения изменений.
     * @param {ChatsPageProps} newProps - Новые свойства.
     */
    public async updateProps(newProps: ChatsPageProps): Promise<void> {
        this.props = { ...this.props, ...newProps };
        await this.handleChatRoute();
    }

    /**
     * Очищает основную контентную область (правую панель).
     * Размонтирует активное окно чата или окно создания чата,
     * чтобы избежать наложения интерфейсов и утечек памяти.
     * @private
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
     * Обрабатывает внутреннюю навигацию на странице чатов.
     * Анализирует URL и решает, что отобразить: плейсхолдер,
     * существующий чат или окно создания нового чата.
     * @private
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
     * Создает и отображает окно для создания нового чата определенного типа.
     * @param {"dialog" | "group" | "channel"} type - Тип создаваемого чата.
     * @private
     */
    private async createChat(type: string) {
        if (!this.mainContentArea) return;

        const myId = await contactService.getMyId();
        switch (type) {
            case 'dialog':
                this.createChatWindow = new CreateDialogWindow({ 
                    router: this.props.router,
                    onSubmit: async (contactId: number, contactName: string) => {
                        const newChat = await chatService.createChat(
                            contactName, 
                            [myId, contactId], 
                            "dialog",
                        );
                        if (newChat && newChat.id) {    
                            this.props.router.navigate(`/chats/${newChat.id}`);
                        }
                    },
                    onSubmitSearch: async (login: string) => {
                        const targetUserId = await contactService.getIdByLogin(login); 
                        const targetUser = {"id": targetUserId, "login": login};

                        if (targetUser && targetUser.id) {
                            if (myId === targetUser.id) {
                                alert("Вы не можете создать диалог с самим собой!");
                                return;
                            }
                            console.log("Отправляем ID:", myId, targetUser.id);
                            const newChat = await chatService.createChat(
                                "Диалог с " + targetUser.login,
                                [myId, targetUser.id], 
                                "dialog"
                            );
                            
                            if (newChat && newChat.id) {
                                this.props.router.navigate(`/chats/${newChat.id}`);
                            }
                        } else {
                            alert(`Пользователь с логином "${login}" не найден!`);
                        }
                    }
                });
                break;
            case 'group':
                this.createChatWindow = new CreateGroupWindow({ 
                    router: this.props.router,
                    onSubmit: async (userIds: number[], groupName: string) => {
                        const newChat = await chatService.createChat(
                            groupName, 
                            [myId, ...userIds], 
                            "group"
                        );
                        if (newChat && newChat.id) {
                            this.props.router.navigate(`/chats/${newChat.id}`);
                        }
                    }
                });
                break;
            case 'channel':
                // todo: Реализовать CreateChannelWindow и раскомментировать эту строку
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

    /**
     * Открывает и отображает окно существующего чата по его ID.
     * Загружает детали чата и его сообщения, затем инициализирует
     * `ChatWindow` с соответствующими компонентами (шапка, список сообщений, поле ввода).
     * @param {string} chatId - ID чата для открытия.
     * @private
     */
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
                headerComponent = new DialogHeader({ 
                    chat: chatDetail as DialogChat,
                    onDeleteChat: async() => {
                        const success = await chatService.deleteChat(chatId);
                        if (success) {
                            this.activeChatId = null;
                            this.props.router.navigate('/chats');
                        } else {
                            alert("Не удалось удалить диалог");
                        }
                    }
                });
                break;

            case 'group':
                headerComponent = new GroupHeader({ 
                    chat: chatDetail as GroupChat,
                    onDeleteChat: async () => {
                        const success = await chatService.deleteChat(chatId);
                        if (success) {
                            this.activeChatId = null;
                            this.props.router.navigate('/chats');
                        } else {
                            alert("Не удалось удалить группу");
                        }
                    }
                });
                break;

            case 'channel':
                headerComponent = new ChannelHeader({ 
                    chat: chatDetail as ChannelChat,
                    onDeleteChat: async () => {
                        const success = await chatService.deleteChat(chatId);
                        if (success) {
                            this.activeChatId = null;
                            this.props.router.navigate('/chats');
                        } else {
                            alert("Не удалось удалить канал");
                        }
                    }
                });
                break;
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

    /**
     * Выполняется перед размонтированием страницы.
     * Очищает все дочерние компоненты и сбрасывает состояние.
     * @protected
     */
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