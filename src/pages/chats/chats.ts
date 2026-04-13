import template from "./chats.hbs";
import { BasePage, IBasePageProps } from "../../core/base/basePage";
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { MenuBar, MenuButtonType } from "../../components/composite/menuBar/menuBar";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper";
import { authService } from "../../services/authService";
import { Button } from "../../components/ui/button/button";
import { BaseComponent } from "../../core/base/baseComponent";
import { ChatWindow } from "../../components/composite/chatWindow/chatWindow";
import { DialogHeader } from "../../components/composite/dialogHeader/dialogHeader";
import { MessageList } from "../../components/composite/messageList/messageList";
import { MessageInput } from "../../components/ui/messageInput/messageInput";
import { Chat, FrontendMessage, DialogChat, GroupChat, ChannelChat } from '../../types/chat';
import { chatService } from "../../services/chatService";
import { GroupHeader } from "../../components/composite/groupHeader/groupHeader";
import { ChannelHeader } from "../../components/composite/channelHeader/channelHeader";
import { FrontendProfile } from "../../types/profile";
import { CreateDialogWindow } from "../../components/composite/createDialogWindow/createDialogWindow"; 
import { CreateGroupWindow } from "../../components/composite/createGroupWindow/createGroupWindow";
import { GroupDetailsWindow } from "../../components/composite/groupDetailsWindow/groupDetailsWindow";
import { AddMemberWindow } from "../../components/composite/addMemberWindow/addMemberWindow";
import { contactService } from "../../services/contactService";
import { ConfirmModal } from "../../components/composite/confirmModal/confirmModal";
import { wsClient, MessageDto } from "../../core/utils/wsClient";


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
    private activeMenuButton: MenuButtonType | null = null;
    
    private chatWindow: ChatWindow | null = null;
    private createChatWindow: BaseComponent | null = null;
    private groupDetailsWindow: GroupDetailsWindow | null = null;
    private addMemberWindow: AddMemberWindow | null = null;
    private modalComponent: ConfirmModal | null = null;
    
    public activeChatId: string | null = null;
    private mainContentArea: HTMLElement | null = null;
    private placeholderElement: HTMLElement | null = null;
    private currentUserId: number | null = null;
    private hasMoreHistory: boolean = false;
    private nextBeforeId: number | null = null;
    private currentUserProfile: FrontendProfile | null = null;

    /** ID текущего запроса истории (используется для защиты от гонок). */
    private historyRequestId = 0;

    /**
     * Ссылка на активный MessageList-компонент.
     * Хранится отдельно для доступа из WS-обработчика сообщений.
     */
    private activeMessageList: MessageList | null = null;

    /**
     * Обработчик глобальных нажатий клавиш.
     * Закрывает текущий чат или всплывающие окна по нажатию Escape.
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            if (this.activeChatId || this.createChatWindow || this.groupDetailsWindow || this.addMemberWindow) {
                this.props.router.navigate('/chats');
            }
        }
    };

    /**
     * Стрелочный обработчик WS-события «message.New».
     * Хранится как поле класса для корректной отписки.
     */
    private readonly handleNewMessage = (dto: MessageDto): void => {
        if (!this.activeChatId || dto.chat_id.toString() !== this.activeChatId) {
            return;
        }

        if (!this.activeMessageList || this.currentUserId === null) {
            return;
        }

        const frontendMsg = chatService.convertWsMessageDto(dto, this.currentUserId);
        this.activeMessageList.addMessage(frontendMsg);
    };

    /**
     * Обработчик системного события переподключения WS.
     * Перезапрашивает историю для активного чата.
     */
    private handleWsConnected = () => {
        if (this.activeChatId) {
            console.log('[ChatsPage] WS переподключен, запрашиваем свежую историю...');
            this.hasMoreHistory = false;
            this.nextBeforeId = null;
            this.loadHistory(this.activeChatId);
        }
    };

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

        this.rebuildSidebar();

        this.mainContentArea = this.element.querySelector('.chat-page__mainfield') || null;
        this.placeholderElement = this.mainContentArea?.querySelector('.empty-field') || null;

        try {
            this.currentUserProfile = await contactService.getMyProfile();
            this.currentUserId = this.currentUserProfile.additionalInfo.id;
        } catch (error) {
            console.error("ChatsPage: Не удалось получить профиль пользователя", error);
        }

        // Подключаемся к глобальному WebSocket-хабу
        wsClient.connect();

        // Подписываемся на системное событие подключения
        wsClient.subscribe('system.Connected', this.handleWsConnected);

        await this.handleChatRoute();

        // Подписываемся на глобальное нажатие клавиш для выхода по Esc
        document.addEventListener('keydown', this.handleKeyDown);
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
        wsClient.unsubscribe('message.New', this.handleNewMessage);
        this.activeMessageList = null;

        if (this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
        }
        if (this.createChatWindow) {
            this.createChatWindow.unmount();
            this.createChatWindow = null;
        }
        if (this.groupDetailsWindow) {
            this.groupDetailsWindow.unmount();
            this.groupDetailsWindow = null;
        }
        if (this.addMemberWindow) {
            this.addMemberWindow.unmount();
            this.addMemberWindow = null;
        }
        if (this.placeholderElement) {
            this.placeholderElement.style.display = 'none';
        }
        this.closeModal();
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

        const isValidId = /^\d+$/.test(lastParam);

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

        // Открытие существующего чата
        if (isValidId) {
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
     * Полностью пересобирает левую панель (сайдбар).
     * Жестко очищает DOM и монтирует компоненты в строгом порядке, 
     * чтобы избежать поломки Flexbox-верстки.
     * @private
     */
    private rebuildSidebar(): void {
        const sidebar = this.element?.querySelector('.chat-page__sidebar');
        if (!sidebar) return;

        this.searchForm?.unmount();
        this.chatWrapper?.unmount();
        this.menuBar?.unmount();
        this.logoutWrapper?.remove();

        sidebar.innerHTML = '';

        this.searchForm = new SearchForm({ router: this.props.router });
        this.searchForm.mount(sidebar as HTMLElement);

        this.chatWrapper = new ChatListWrapper({ 
            router: this.props.router,
            activeChatId: this.activeChatId,
        });
        this.chatWrapper.mount(sidebar as HTMLElement);

        this.logoutWrapper = document.createElement('div');
        this.logoutWrapper.style.flex = '1';
        this.logoutWrapper.style.display = 'none';
        this.logoutWrapper.style.alignItems = 'center';
        this.logoutWrapper.style.justifyContent = 'center';
        sidebar.appendChild(this.logoutWrapper);

        this.menuBar = new MenuBar({
            onSettingsClick: () => this.props.router.navigate('/settings'),
            onMessagesClick: () => this.props.router.navigate('/chats'),
            onContactsClick: () => this.props.router.navigate('/contacts'),
        });
        this.menuBar.mount(sidebar as HTMLElement);
        
        if (this.activeMenuButton) {
            this.menuBar.setActiveButton(this.activeMenuButton);
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
        this.cleanupMainContent();

        switch (type) {
            case 'dialog':
                this.createChatWindow = new CreateDialogWindow({ 
                    router: this.props.router,
                    onSubmit: async (contactId: number, contactName: string) => {
                        const res = await chatService.createChat(
                            [contactId], 
                            "dialog",
                        );
                        if (res.success && res.body?.id) {   
                            this.rebuildSidebar(); 
                            this.props.router.navigate(`/chats/${res.body.id}`);
                        }
                    },
                    onSubmitSearch: async (login: string) => {
                        const targetLogin = login.trim().toLowerCase();
                        if (this.currentUserProfile && this.currentUserProfile.additionalInfo.login.toLowerCase() === targetLogin) {
                            return "Вы не можете создать диалог с самим собой!";
                        }

                        const targetUserRes = await contactService.getIdByLogin(login); 
                        const targetUser = {"id": targetUserRes.id, "login": login};

                        if (targetUserRes.status === 404 || !targetUser.id) {
                            return `Пользователь с логином "${login}" не найден!`;
                        }

                        if (myId === targetUser.id) {
                            return "Вы не можете создать диалог с самим собой!";
                        }
                        const res = await chatService.createChat(
                            [targetUser.id], 
                            "dialog",
                        );
                        
                        if (res.status === 409) {
                            return "Диалог с этим пользователем уже существует";
                        }

                        if (res.success && res.body?.id) {
                            this.rebuildSidebar(); 
                            this.props.router.navigate(`/chats/${res.body.id}`);
                            return undefined;
                        } else {
                            return "Произошла ошибка при создании диалога";
                        }
                    }
                });
                break;
            case 'group':
                this.createChatWindow = new CreateGroupWindow({ 
                    router: this.props.router,
                    onSubmit: async (userIds: number[], groupName: string) => {
                        const res = await chatService.createChat(
                            [myId, ...userIds], 
                            "group",
                            groupName
                        );
                        if (res.success && res.body?.id) {
                            this.rebuildSidebar(); 
                            this.props.router.navigate(`/chats/${res.body.id}`);
                        }
                    },
                    onSubmitSearch: async (login: string) => {
                        const targetLogin = login.trim().toLowerCase();
                        if (this.currentUserProfile && this.currentUserProfile.additionalInfo.login.toLowerCase() === targetLogin) {
                            return "Вы не можете добавить самого себя в контакты!";
                        }

                        const targetUserRes = await contactService.getIdByLogin(login); 
                        
                        if (targetUserRes.status === 404 || !targetUserRes.id) {
                            return `Пользователь с логином "${login}" не найден!`;
                        }

                        if (myId === targetUserRes.id) {
                            return "Вы не можете добавить в контакты самого себя!";
                        }
                        
                        const successRes = await contactService.addContact(login, targetUserRes.id);
                        
                        if (successRes.success) {
                            this.rebuildSidebar(); 
                            this.props.router.navigate(`/chats/create-group`);
                            return undefined;
                        } else if (successRes.code === 'CANT_CREATE_CONTACT_WITH_YOURSELF') {
                            return "Вы не можете добавить самого себя в контакты";
                        } else if (successRes.status === 409) {
                            return `Пользователь "${login}" уже в контактах!`;
                        } else {
                            return `Ошибка сервера: ${successRes.status}`;
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

        if (this.activeChatId !== chatId) {
            return;
        }
        if (!chatDetail) {
            this.props.router.navigate('/chats');
            return;
        }
        this.cleanupMainContent();

        let headerComponent: BaseComponent;
        switch (chatDetail.type) {
            case 'dialog':
                const members = await chatService.getChatMembers(chatId);
                const myId = await contactService.getMyId();
                const interlocutorId = members.find(id => id !== myId) || members[0] || 0;
                
                (chatDetail as DialogChat).interlocutor.id = interlocutorId;

                headerComponent = new DialogHeader({ 
                    chat: chatDetail as DialogChat,
                    onOpenProfile: () => this.props.router.navigate('/contacts/' + interlocutorId),
                    onDeleteChat: async() => {
                        const res = await chatService.deleteChat(chatId);
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            const errorMsg = res.errorCode === 'CANT_DELETE_CHAT'
                                ? "Вы не можете удалить этот чат"
                                : "Не удалось удалить диалог";
                            this.showAlert(errorMsg);
                        }
                    }
                });
                break;

            case 'group':
                headerComponent = new GroupHeader({ 
                    chat: chatDetail as GroupChat,
                    onDeleteChat: async () => {
                        const res = await chatService.deleteChat(chatId);
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            let errorMsg = "Не удалось удалить группу";
                            if (res.errorCode === 'CANT_DELETE_CHAT' || res.status === 403) {
                                errorMsg = "Нет прав на удаление чата (вы не владелец)";
                            }
                            this.showAlert(errorMsg, () => {
                                this.openGroupDetails(chatDetail as GroupChat);
                            });
                        }
                    },
                    onOpenGroupInfo: () => this.openGroupDetails(chatDetail as GroupChat)
                });
                break;

            case 'channel':
                headerComponent = new ChannelHeader({ 
                    chat: chatDetail as ChannelChat,
                    onDeleteChat: async () => {
                        const res = await chatService.deleteChat(chatId);
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            const errorMsg = res.errorCode === 'CANT_DELETE_CHAT'
                                ? "Вы не можете удалить этот чат"
                                : "Не удалось удалить канал";
                            this.showAlert(errorMsg);
                        }
                    }
                });
                break;
        }

        const messageListComponent = new MessageList({ 
            messages: [],
            currentUser: {
                id: this.currentUserId as number,
                login: this.currentUserProfile?.additionalInfo.login || "",
                avatarUrl: this.currentUserProfile?.mainInfo.avatarUrl
            },
            chatType: chatDetail.type,
            onLoadMore: async () => {
                if (!this.hasMoreHistory || !this.nextBeforeId || !this.currentUserId || !this.activeChatId) return;
                
                const res = await chatService.getMessages(this.activeChatId, this.currentUserId as number, this.nextBeforeId);
                
                if (res === null) return;

                if (this.activeChatId === chatDetail.id && this.activeMessageList) {
                    this.hasMoreHistory = res.hasMore;
                    this.nextBeforeId = res.nextBeforeId;
                    this.activeMessageList.prependMessages(res.messages);
                }
            }
        });

        this.activeMessageList = messageListComponent;

        const messageInputComponent = new MessageInput({
            onSubmit: (text: string) => {
                if (this.activeChatId) {
                    chatService.sendMessage(this.activeChatId, text);
                }
            } 
        });

        this.chatWindow = new ChatWindow({
            headerComponent: headerComponent,
            messageListComponent: messageListComponent,
            inputComponent: messageInputComponent
        });
        
        this.chatWindow.mount(this.mainContentArea);

        // Подписываемся на новые сообщения (соединение уже установлено в afterMount)
        wsClient.subscribe('message.New', this.handleNewMessage);

        // Загружаем историю через сокеты сразу после открытия чата
        this.loadHistory(chatId);
    }

    /**
     * Загружает историю сообщений через WebSocket и обновляет MessageList.
     * @param {string} chatId - ID чата для загрузки истории.
     * @private
     */
    private async loadHistory(chatId: string): Promise<void> {
        if (!this.currentUserId) {
            this.currentUserId = await contactService.getMyId();
        }

        const reqId = ++this.historyRequestId;

        const res = await chatService.getMessages(chatId, this.currentUserId as number, null);
        
        if (this.activeChatId !== chatId || reqId !== this.historyRequestId) {
            return;
        }

        if (res === null) {
            return;
        }

        if (this.activeMessageList) {
            this.hasMoreHistory = res.hasMore;
            this.nextBeforeId = res.nextBeforeId;
            this.activeMessageList.setMessages(res.messages);
        }
    }


    /**
     * Открывает окно деталей группы поверх чата.
     * При успешном обновлении группы (название/аватарка) пересобирает
     * шапку чата и сайдбар, чтобы отобразить актуальные данные.
     * @param chat Объект группы.
     * @param initialIsEditing Флаг для открытия сразу в режиме редактирования.
     */
    private async openGroupDetails(chat: GroupChat, initialIsEditing: boolean = false): Promise<void> {
        if (!this.mainContentArea) return;

        // Очищаем старый экземпляр, если он есть
        if (this.groupDetailsWindow) {
            this.groupDetailsWindow.unmount();
            this.groupDetailsWindow = null;
        }
        if (this.addMemberWindow) {
            this.addMemberWindow.unmount();
            this.addMemberWindow = null;
        }

        if (this.chatWindow?.element) {
            this.chatWindow.element.style.display = 'none';
        }

        // Загружаем список ID участников
        const memberIds = await chatService.getChatMembers(chat.id);
        
        // Загружаем профили участников
        const profiles = await Promise.all(memberIds.map(id => contactService.getProfileInfo(id)));

        const members = profiles.map((p, index) => ({
            id: memberIds[index],
            name: `${p.mainInfo.firstName}${p.mainInfo.lastName ? ' ' + p.mainInfo.lastName : ''}`,
            avatarUrl: p.mainInfo.avatarUrl || '/assets/images/avatars/defaultAvatar.svg'
        }));

        const myId = await contactService.getMyId();

        this.groupDetailsWindow = new GroupDetailsWindow({
            groupId: chat.id,
            groupName: chat.title,
            groupAvatarUrl: chat.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
            // Оставляем owner, чтобы кнопки были доступны; сервер проверит права при действии
            currentUserRole: 'owner',
            members: members,
            initialIsEditing: initialIsEditing,
            onBack: () => {
                if (this.groupDetailsWindow) {
                    this.groupDetailsWindow.unmount();
                    this.groupDetailsWindow = null;
                }
                if (this.chatWindow?.element) {
                    this.chatWindow.element.style.display = 'flex';
                }
            },
            onLeaveGroup: async () => {
                const res = await chatService.leaveGroup(chat.id);
                if (res.success) {
                    if (this.groupDetailsWindow) {
                        this.groupDetailsWindow.unmount();
                        this.groupDetailsWindow = null;
                    }
                    this.activeChatId = null;
                    this.rebuildSidebar();
                    this.props.router.navigate('/chats');
                } else {
                    let errorMsg = 'Не удалось покинуть группу.';
                    
                    if (res.status === 403 || res.errorCode === 'CANT_LEAVE_OWN_CHAT') {
                        errorMsg = 'У вас нет прав для выхода (вы владелец)';
                    } else if (res.status === 400) {
                        errorMsg = 'Неверный запрос или попытка выхода из личного диалога.';
                    } else if (res.status === 404) {
                        errorMsg = 'Чат не найден.';
                    } else if (res.errorMessage) {
                        errorMsg = res.errorMessage;
                    } else if (res.errorCode) {
                        errorMsg = `Ошибка: ${res.errorCode}`;
                    }

                    this.showAlert(errorMsg, () => {
                        this.openGroupDetails(chat);
                    });
                }
            },
            onGroupUpdated: async () => {
                this.rebuildSidebar();
                if (this.activeChatId) {
                    if (this.groupDetailsWindow) {
                        this.groupDetailsWindow.unmount();
                        this.groupDetailsWindow = null;
                    }
                    this.chatWindow?.unmount();
                    this.chatWindow = null;
                    await this.openChat(this.activeChatId);
                }
            },
            onRemoveMember: async (userId: number) => {
                const res = await chatService.removeMember(chat.id, userId);
                if (!res.success) {
                    let errorMsg = 'Произошла ошибка при удалении участника.';
                    if (res.status === 403) {
                        errorMsg = 'Только владелец может удалять участников.';
                    } else if (res.status === 400) {
                        errorMsg = 'Невозможно удалить владельца чата.';
                    }
                    
                    this.showAlert(errorMsg, () => {
                        this.openGroupDetails(chat);
                    });
                    return false;
                }
                return true;
            },
            onAddMember: () => {
                this.openAddMemberWindow(chat);
            },
            onMemberClick: (userId: number) => {
                this.props.router.navigate(`/contacts/${userId}`);
            }
        });

        this.groupDetailsWindow.mount(this.mainContentArea);
    }
    /**
     * Открывает окно добавления участника в группу по логину.
     * Прячет окно деталей группы и показывает форму поиска пользователя.
     * @param chat — Объект группового чата, в который добавляем участника.
     */
    private openAddMemberWindow(chat: GroupChat): void {
        if (!this.mainContentArea) return;

        if (this.addMemberWindow) {
            this.addMemberWindow.unmount();
            this.addMemberWindow = null;
        }

        if (this.groupDetailsWindow?.element) {
            this.groupDetailsWindow.element.style.display = 'none';
        }

        this.addMemberWindow = new AddMemberWindow({
            onBack: () => {
                if (this.addMemberWindow) {
                    this.addMemberWindow.unmount();
                    this.addMemberWindow = null;
                }
                if (this.groupDetailsWindow?.element) {
                    this.groupDetailsWindow.element.style.display = 'flex';
                }
            },
            onSubmitSearch: async (login: string) => {
                const targetLogin = login.trim().toLowerCase();
                if (this.currentUserProfile && this.currentUserProfile.additionalInfo.login.toLowerCase() === targetLogin) {
                    return "Вы не можете добавить самого себя в чат!";
                }

                const targetUserRes = await contactService.getIdByLogin(login);

                if (targetUserRes.status === 404 || !targetUserRes.id) {
                    return `Пользователь с логином "${login}" не найден!`;
                }

                const res = await chatService.addMembersToChat(chat.id, [targetUserRes.id]);

                if (res.success) {
                    if (this.addMemberWindow) {
                        this.addMemberWindow.unmount();
                        this.addMemberWindow = null;
                    }
                    if (this.groupDetailsWindow) {
                        this.groupDetailsWindow.unmount();
                        this.groupDetailsWindow = null;
                    }
                    this.rebuildSidebar();
                    if (this.activeChatId) {
                        this.chatWindow?.unmount();
                        this.chatWindow = null;
                        await this.openChat(this.activeChatId);
                    }
                    return undefined;
                } else {
                    if (res.errorCode === 'MEMBER_ALREADY_IN_CHAT') {
                        return "Пользователь уже в чате";
                    }
                    if (res.status === 403) {
                        return "Только владелец может добавлять новых участников";
                    }
                    if (res.status === 400) {
                        return "Неверный запрос (проверьте данные)";
                    }
                    return 'Не удалось добавить участника.';
                }
            }
        });

        this.addMemberWindow.mount(this.mainContentArea);
    }

    /**
     * Выполняется перед размонтированием страницы.
     * Очищает все дочерние компоненты и сбрасывает состояние.
     * @protected
     */
    beforeUnmount() {
        this.cleanupMainContent();
        this.closeModal();
        this.logoutWrapper?.remove();
        this.searchForm?.unmount();
        this.chatWrapper?.unmount();
        this.menuBar?.unmount();
        this.logoutButton?.unmount();
        
        wsClient.unsubscribe('system.Connected', this.handleWsConnected);
        wsClient.disconnect();
        
        // Отписываемся от глобального события
        document.removeEventListener('keydown', this.handleKeyDown);
        
        this.activeChatId = null;
        this.placeholderElement = null; 
    }

    private showAlert(text: string, onConfirm?: () => void): void {
        this.closeModal();
        this.modalComponent = new ConfirmModal({
            text: text,
            confirmButtonText: "Ок",
            hideCancel: true,
            confirmButtonClass: "confirm-modal__button--submit ui-button",
            onConfirm: () => {
                this.closeModal();
                if (onConfirm) {
                    onConfirm();
                }
            }
        });
        this.modalComponent.mount(document.body);
    }

    private closeModal(): void {
        if (this.modalComponent) {
            this.modalComponent.unmount();
            this.modalComponent = null;
        }
    }
}