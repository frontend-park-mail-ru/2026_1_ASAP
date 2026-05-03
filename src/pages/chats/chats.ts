import template from "./chats.hbs";
import { BasePage, IBasePageProps } from "../../core/base/basePage";
import { OnboardingEmpty } from "../../components/composite/onboardingEmpty/onboardingEmpty";
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
import { channelService, type ChannelRole } from "../../services/channelService";
import { GroupHeader } from "../../components/composite/groupHeader/groupHeader";
import { ChannelHeader } from "../../components/composite/channelHeader/channelHeader";
import { ChannelJoinFooter } from "../../components/composite/channelJoinFooter/channelJoinFooter";
import { FrontendProfile } from "../../types/profile";
import { CreateDialogWindow } from "../../components/composite/createDialogWindow/createDialogWindow";
import { CreateGroupWindow } from "../../components/composite/createGroupWindow/createGroupWindow";
import { CreateChannelWindow } from "../../components/composite/createChannelWindow/createChannelWindow";
import { GroupDetailsWindow } from "../../components/composite/groupDetailsWindow/groupDetailsWindow";
import { ChannelDetailsWindow } from "../../components/composite/channelDetailsWindow/channelDetailsWindow";
import { AddMemberWindow } from "../../components/composite/addMemberWindow/addMemberWindow";
import { contactService } from "../../services/contactService";
import { ConfirmModal } from "../../components/composite/confirmModal/confirmModal";
import { wsClient, MessageDto } from "../../core/utils/wsClient";
import { offlineQueue } from "../../services/offlineMessageQueue";


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
    private channelDetailsWindow: ChannelDetailsWindow | null = null;
    private addMemberWindow: AddMemberWindow | null = null;
    private modalComponent: ConfirmModal | null = null;
    private onboardingComponent: OnboardingEmpty | null = null;
    
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
    private activeMessageInput: MessageInput | null = null;
    private activeChannelRole: ChannelRole | null = null;

    /**
     * Обработчик глобальных нажатий клавиш.
     * Закрывает текущий чат или всплывающие окна по нажатию Escape.
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            if (this.activeChatId || this.createChatWindow || this.groupDetailsWindow || this.channelDetailsWindow || this.addMemberWindow) {
                this.props.router.navigate('/chats');
            }
        }
    };

    /**
     * Стрелочный обработчик WS-события «message.New».
     * Хранится как поле класса для корректной отписки.
     */
    private readonly handleNewMessage = async (dto: MessageDto): Promise<void> => {
        if (!this.activeChatId || dto.chat_id.toString() !== this.activeChatId) {
            return;
        }

        if (!this.activeMessageList || this.currentUserId === null) {
            return;
        }

        const tempId = await chatService.resolveServerMessage(dto, this.currentUserId);
        const serverTime = dto.created_at ? new Date(dto.created_at) : undefined;
        if (tempId && this.activeMessageList.replaceMessageId(tempId, dto.id.toString(), serverTime)) {
            return;
        }

        const frontendMsg = chatService.convertWsMessageDto(dto, this.currentUserId);
        this.activeMessageList.addMessage(frontendMsg);
    };

    private readonly handleMessageEdited = (dto: MessageDto): void => {
        if (!this.activeChatId || dto.chat_id.toString() !== this.activeChatId) return;
        if (!this.activeMessageList) return;
        this.activeMessageList.updateMessage(dto.id.toString(), dto.text);
    };

    /**
     * Обработчик системного события переподключения WS.
     * Перезапрашивает историю для активного чата и флашит offline-очередь.
     */
    private handleWsConnected = () => {
        chatService.flushQueue();
        if (this.activeChatId) {
            console.log('[ChatsPage] WS переподключен, запрашиваем свежую историю...');
            this.hasMoreHistory = false;
            this.nextBeforeId = null;
            this.loadHistory(this.activeChatId);
        }
    };

    /**
     * Триггер флаша очереди при восстановлении сети.
     */
    private handleOnline = (): void => {
        chatService.flushQueue();
    };

    /**
     * Триггер флаша очереди по сообщению от Service Worker (Background Sync).
     */
    private handleSwMessage = (event: MessageEvent): void => {
        if (event.data?.type === 'flush-messages') {
            chatService.flushQueue();
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

        wsClient.connect();

        wsClient.subscribe('system.Connected', this.handleWsConnected);

        wsClient.subscribe('system.Disconnected', () => {
            chatService.clearInFlight();
        });

        await this.handleChatRoute();

        document.addEventListener('keydown', this.handleKeyDown);

        // Триггеры флаша оффлайн-очереди сообщений
        window.addEventListener('online', this.handleOnline);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', this.handleSwMessage);
        }

        const mobileBack = this.element.querySelector('.chat-page__mobile-back');
        mobileBack?.addEventListener('click', this.handleMobileBack);

        this.syncMobileLayoutState();
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
        wsClient.unsubscribe('message.Update', this.handleMessageEdited);
        this.activeMessageList = null;
        this.activeMessageInput = null;
        this.activeChannelRole = null;

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
        if (this.channelDetailsWindow) {
            this.channelDetailsWindow.unmount();
            this.channelDetailsWindow = null;
        }
        if (this.addMemberWindow) {
            this.addMemberWindow.unmount();
            this.addMemberWindow = null;
        }
        if (this.placeholderElement) {
            this.placeholderElement.style.display = 'none';
        }
        if (this.onboardingComponent) {
            this.onboardingComponent.unmount();
            this.onboardingComponent = null;
        }
        this.closeModal();
    }

    private mountOnboarding(obKey: string): void {
        if (!this.element || this.onboardingComponent) return;
        this.onboardingComponent = new OnboardingEmpty({
            onComplete: () => {
                sessionStorage.setItem(obKey, '1');
                this.onboardingComponent?.unmount();
                this.onboardingComponent = null;
                this.props.router.navigate('/chats/create-dialog');
            },
        });
        this.onboardingComponent.mount(this.element);
    }

    /**
     * Обрабатывает внутреннюю навигацию на странице чатов.
     * Анализирует URL и решает, что отобразить: плейсхолдер,
     * существующий чат или окно создания нового чата.
     * @private
     */
    private async handleChatRoute(): Promise<void> {
        try {
            const path = this.props.currentPath || window.location.pathname;
            const pathParts = path.split('/');
            const lastParam = pathParts[pathParts.length - 1];

            const isValidId = /^\d+$/.test(lastParam);

            // Корень чатов (показываем плейсхолдер или онбординг)
            if (path === '/chats') {
                this.cleanupMainContent();
                this.activeChatId = null;
                this.chatWrapper?.setActiveChat(null);

                if (this.currentUserId !== null) {
                    const obKey = `pulse_ob_closed_${this.currentUserId}`;
                    if (!sessionStorage.getItem(obKey)) {
                        try {
                            const chats = await chatService.getChats(this.currentUserId);
                            if (chats.length === 0) {
                                this.mountOnboarding(obKey);
                                return;
                            }
                        } catch {
                            // не удалось проверить — показываем обычный плейсхолдер
                        }
                    }
                }

                if (this.placeholderElement) {
                    this.placeholderElement.style.display = 'block';
                }
                return;
            }

            if (isValidId) {
                if (lastParam !== this.activeChatId || !this.chatWindow) {
                    this.cleanupMainContent();

                    this.activeChatId = lastParam;
                    this.chatWrapper?.setActiveChat(lastParam);
                    await this.openChat(lastParam);
                }
                return;
            }

            if (path.startsWith('/chats/create-')) {
                this.cleanupMainContent();

                this.activeChatId = null;
                this.chatWrapper?.setActiveChat(null);

                const chatType = path.replace('/chats/create-', '');
                await this.createChat(chatType);
                return;
            }
        } finally {
            this.syncMobileLayoutState();
        }
    }

    /**
     * На узких экранах переключает вид: список чатов или основная область (чат / создание / детали).
     */
    private syncMobileLayoutState(): void {
        const pageRoot = this.element?.classList.contains('chat-page')
            ? this.element
            : this.element?.querySelector('.chat-page');
        if (!pageRoot) return;

        const mainVisible =
            this.activeChatId !== null ||
            this.createChatWindow !== null ||
            this.groupDetailsWindow !== null ||
            this.channelDetailsWindow !== null ||
            this.addMemberWindow !== null;

        /**
         * Плавающая ‹ только у экрана открытого чата (в шапке чата нет своей «Назад»).
         * Детали группы / добавление участника / создание чата — своя кнопка в ActionHeader.
         */
        const mobileFloatingBackVisible =
            this.activeChatId !== null &&
            this.createChatWindow === null &&
            this.groupDetailsWindow === null &&
            this.channelDetailsWindow === null &&
            this.addMemberWindow === null;

        pageRoot.classList.toggle('chat-page--main-visible', mainVisible);
        pageRoot.classList.toggle('chat-page--mobile-floating-back', mobileFloatingBackVisible);
    }

    private readonly handleMobileBack = (): void => {
        if (
            this.activeChatId ||
            this.createChatWindow ||
            this.groupDetailsWindow ||
            this.channelDetailsWindow ||
            this.addMemberWindow
        ) {
            this.props.router.navigate('/chats');
        }
    };

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
                            return;
                        }
                        if (res.status === 409) {
                            const chatId = await chatService.findExistingDialogChatId(contactId);
                            if (chatId) {
                                this.props.router.navigate(`/chats/${chatId}`);
                            }
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
                this.createChatWindow = new CreateChannelWindow({
                    router: this.props.router,
                    onSubmit: async (title: string, _avatar?: File) => {
                        // TODO: avatar при создании не передаётся на бэк, ставить через "Изменить" после создания
                        const res = await channelService.createChannel(
                            { title },
                            myId
                        );
                        if (res.success && res.channelId) {
                            this.rebuildSidebar();
                            this.props.router.navigate(`/chats/${res.channelId}`);
                            return;
                        }

                        const errorMsg = res.status === 403
                            ? 'У вас нет прав на создание канала'
                            : 'Не удалось создать канал. Попробуйте ещё раз';
                        this.showAlert(errorMsg);
                    },
                });
                break;
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

        try {
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
            let footerComponent: BaseComponent | undefined;
            let canWriteActiveChat = chatDetail.type !== 'channel';
            let canJoinActiveChat = false;

            switch (chatDetail.type) {
            case 'dialog':
                const members = await chatService.getChatMembers(chatId);
                const myId = await contactService.getMyId();
                const interlocutorId = members.find(id => id !== myId) || members[0] || 0;
                
                (chatDetail as DialogChat).interlocutor.id = interlocutorId;

                const interlocutorProfile = await contactService.getProfileInfo(interlocutorId);
                const interlocutorLogin = interlocutorProfile?.additionalInfo?.login || String(interlocutorId);

                headerComponent = new DialogHeader({ 
                    chat: chatDetail as DialogChat,
                    onOpenProfile: () => this.props.router.navigate('/contacts/' + interlocutorLogin),
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

            case 'channel': {
                if (this.currentUserId === null) return;
                const channelDetail = await channelService.getChannel(chatId, this.currentUserId);
                if (!channelDetail) {
                    this.props.router.navigate('/chats');
                    return;
                }
                (chatDetail as ChannelChat).currentUserRole = channelDetail.currentUserRole;
                (chatDetail as ChannelChat).subscribersCount = channelDetail.subscribersCount;
                this.activeChannelRole = channelDetail.currentUserRole;
                canWriteActiveChat = channelDetail.currentUserRole === 'owner';
                canJoinActiveChat = channelDetail.currentUserRole === 'guest';

                headerComponent = new ChannelHeader({
                    chat: chatDetail as ChannelChat,
                    currentUserRole: channelDetail.currentUserRole,
                    onDeleteChat: async () => {
                        const res = await channelService.deleteChannel(chatId);
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            const errorMsg = res.errorCode === 'CANT_DELETE_CHAT'
                                ? 'Вы не можете удалить этот канал'
                                : 'Не удалось удалить канал';
                            this.showAlert(errorMsg);
                        }
                    },
                    onLeaveChannel: async () => {
                        if (channelDetail.currentUserRole !== 'participant') {
                            this.showAlert('Вы не подписаны на этот канал');
                            return;
                        }
                        const res = await channelService.leaveChannel(chatId);
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            this.showAlert('Не удалось покинуть канал');
                        }
                    },
                    onOpenChannelInfo: () => this.openChannelDetails(chatDetail as ChannelChat),
                });
                break;
            }
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
            },
            onRequestEdit: (messageId, currentText) => {
                this.activeMessageInput?.enterEditMode(messageId, currentText);
            },
            });

            this.activeMessageList = messageListComponent;

            if (canWriteActiveChat) {
                const messageInputComponent = new MessageInput({
                    onSubmit: async (text: string) => {
                        if (!this.activeChatId || this.currentUserId === null) return;
                        if (chatDetail.type === 'channel' && this.activeChannelRole !== 'owner') return;

                        const pending = await chatService.sendMessage(
                            this.activeChatId,
                            text,
                            this.currentUserId as number,
                        );

                        const optimistic: FrontendMessage = {
                            id: pending.tempId,
                            sender: {
                                id: this.currentUserId as number,
                                login: this.currentUserProfile?.additionalInfo.login || '',
                                avatarUrl: this.currentUserProfile?.mainInfo.avatarUrl,
                                firstName: this.currentUserProfile?.mainInfo.firstName,
                                lastName: this.currentUserProfile?.mainInfo.lastName,
                            },
                            text,
                            timestamp: new Date(pending.createdAt),
                            isOwn: true,
                        };
                        this.activeMessageList?.addMessage(optimistic);
                    },
                    onSubmitEdit: (messageId, newText) => {
                        if (!this.activeChatId) return;
                        if (chatDetail.type === 'channel' && this.activeChannelRole !== 'owner') return;
                        const ok = chatService.editMessage(this.activeChatId, messageId, newText);
                        if (!ok) {
                            this.showAlert?.('No connection, try later');
                        }
                    },
                });
                this.activeMessageInput = messageInputComponent;
                footerComponent = messageInputComponent;
            } else if (canJoinActiveChat) {
                footerComponent = new ChannelJoinFooter({
                    onJoin: () => this.handleJoinChannel(chatId),
                });
            }

            this.chatWindow = new ChatWindow({
                headerComponent: headerComponent,
                messageListComponent: messageListComponent,
                inputComponent: footerComponent
            });

            this.chatWindow.mount(this.mainContentArea);

            // Подписываемся на новые сообщения (соединение уже установлено в afterMount)
            wsClient.subscribe('message.New', this.handleNewMessage);
            wsClient.subscribe('message.Update', this.handleMessageEdited);

            await this.loadHistory(chatId);
            if (canWriteActiveChat) {
                await this.restorePendingMessages(chatId);
            }
        } finally {
            this.syncMobileLayoutState();
        }
    }

    private async handleJoinChannel(chatId: string): Promise<void> {
        const res = await channelService.joinChannel(chatId);
        if (!res.success) {
            let errorMsg = 'Не удалось подписаться на канал';
            if (res.status === 404) {
                errorMsg = 'Канал не найден';
            } else if (res.status === 409) {
                errorMsg = 'Вы уже подписаны на этот канал';
            } else if (res.errorMessage) {
                errorMsg = res.errorMessage;
            }
            this.showAlert(errorMsg);
            return;
        }

        this.rebuildSidebar();
        if (this.activeChatId === chatId) {
            await this.openChat(chatId);
        }
    }

    /**
     * Догружает оптимистичные сообщения из IndexedDB (если остались с прошлой офлайн-сессии)
     * и добавляет их в текущий список сообщений.
     * @private
     */
    private async restorePendingMessages(chatId: string): Promise<void> {
        if (!this.activeMessageList || this.currentUserId === null) return;
        if (this.activeChatId !== chatId) return;

        const pending = await offlineQueue.getByChat(chatId);
        if (pending.length === 0) return;

        pending.forEach((p) => {
            this.activeMessageList?.addMessage({
                id: p.tempId,
                sender: {
                    id: p.senderId,
                    login: this.currentUserProfile?.additionalInfo.login || '',
                    avatarUrl: this.currentUserProfile?.mainInfo.avatarUrl,
                    firstName: this.currentUserProfile?.mainInfo.firstName,
                    lastName: this.currentUserProfile?.mainInfo.lastName,
                },
                text: p.text,
                timestamp: new Date(p.createdAt),
                isOwn: true,
            });
        });
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
                this.syncMobileLayoutState();
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
                    let errorMsg = 'Не удалось покинуть группу';

                    if (res.status === 403 || res.errorCode === 'CANT_LEAVE_OWN_CHAT') {
                        errorMsg = 'У вас нет прав для выхода (вы владелец)';
                    } else if (res.status === 400) {
                        errorMsg = 'Неверный запрос или попытка выхода из личного диалога';
                    } else if (res.status === 404) {
                        errorMsg = 'Чат не найден';
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
                    let errorMsg = 'Произошла ошибка при удалении участника';
                    if (res.status === 403) {
                        errorMsg = 'Только владелец может удалять участников';
                    } else if (res.status === 400) {
                        errorMsg = 'Невозможно удалить владельца чата';
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
            onMemberClick: async (userId: number) => {
                const memberProfile = await contactService.getProfileInfo(userId);
                const memberLogin = memberProfile?.additionalInfo?.login || String(userId);
                this.props.router.navigate(`/contacts/${memberLogin}`);
            }
        });

        this.groupDetailsWindow.mount(this.mainContentArea);
        this.syncMobileLayoutState();
    }
    /**
     * Открывает окно деталей канала поверх чата.
     * Загружает свежие данные через channelService, монтирует ChannelDetailsWindow.
     */
    private async openChannelDetails(chat: ChannelChat): Promise<void> {
        if (!this.mainContentArea || this.currentUserId === null) return;

        if (this.channelDetailsWindow) {
            this.channelDetailsWindow.unmount();
            this.channelDetailsWindow = null;
        }

        if (this.chatWindow?.element) {
            this.chatWindow.element.style.display = 'none';
        }

        const channelDetail = await channelService.getChannel(chat.id, this.currentUserId);
        if (!channelDetail) {
            if (this.chatWindow?.element) {
                this.chatWindow.element.style.display = 'flex';
            }
            this.syncMobileLayoutState();
            this.showAlert('Не удалось загрузить информацию о канале');
            return;
        }

        this.channelDetailsWindow = new ChannelDetailsWindow({
            channel: channelDetail,
            onBack: () => {
                if (this.channelDetailsWindow) {
                    this.channelDetailsWindow.unmount();
                    this.channelDetailsWindow = null;
                }
                if (this.chatWindow?.element) {
                    this.chatWindow.element.style.display = 'flex';
                }
                this.syncMobileLayoutState();
            },
            onLeaveChannel: async () => {
                if (channelDetail.currentUserRole !== 'participant') {
                    this.showAlert('Вы не подписаны на этот канал', () => {
                        this.openChannelDetails(chat);
                    });
                    return;
                }
                const res = await channelService.leaveChannel(chat.id);
                if (res.success) {
                    if (this.channelDetailsWindow) {
                        this.channelDetailsWindow.unmount();
                        this.channelDetailsWindow = null;
                    }
                    this.activeChatId = null;
                    this.rebuildSidebar();
                    this.props.router.navigate('/chats');
                } else {
                    this.showAlert('Не удалось покинуть канал', () => {
                        this.openChannelDetails(chat);
                    });
                }
            },
            onDeleteChannel: async () => {
                const res = await channelService.deleteChannel(chat.id);
                if (res.success) {
                    if (this.channelDetailsWindow) {
                        this.channelDetailsWindow.unmount();
                        this.channelDetailsWindow = null;
                    }
                    this.activeChatId = null;
                    this.rebuildSidebar();
                    this.props.router.navigate('/chats');
                } else {
                    const errorMsg = res.errorCode === 'CANT_DELETE_CHAT'
                        ? 'Вы не можете удалить этот канал'
                        : 'Не удалось удалить канал';
                    this.showAlert(errorMsg, () => {
                        this.openChannelDetails(chat);
                    });
                }
            },
            onUpdateChannel: async (title?: string, description?: string, avatar?: File) => {
                if (this.currentUserId === null) return { success: false };
                return channelService.updateChannel(chat.id, { title, description, avatar }, this.currentUserId);
            },
            onChannelUpdated: () => {
                this.rebuildSidebar();
                if (this.activeChatId) {
                    if (this.channelDetailsWindow) {
                        this.channelDetailsWindow.unmount();
                        this.channelDetailsWindow = null;
                    }
                    this.chatWindow?.unmount();
                    this.chatWindow = null;
                    this.openChat(this.activeChatId);
                }
            },
            onRemoveMember: async (userId: number) => {
                const res = await channelService.removeMember(chat.id, userId);
                if (!res.success) {
                    this.showAlert('Не удалось удалить участника', () => {
                        this.openChannelDetails(chat);
                    });
                    return false;
                }
                return true;
            },
            onMemberClick: async (userId: number) => {
                const memberProfile = await contactService.getProfileInfo(userId);
                const memberLogin = memberProfile?.additionalInfo?.login || String(userId);
                this.props.router.navigate(`/contacts/${memberLogin}`);
            },
        });

        this.channelDetailsWindow.mount(this.mainContentArea);
        this.syncMobileLayoutState();
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
                this.syncMobileLayoutState();
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
                    return 'Не удалось добавить участника';
                }
            }
        });

        this.addMemberWindow.mount(this.mainContentArea);
        this.syncMobileLayoutState();
    }

    /**
     * Выполняется перед размонтированием страницы.
     * Очищает все дочерние компоненты и сбрасывает состояние.
     * @protected
     */
    beforeUnmount() {
        this.onboardingComponent?.unmount();
        this.onboardingComponent = null;
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

        this.element?.querySelector('.chat-page__mobile-back')
            ?.removeEventListener('click', this.handleMobileBack);

        window.removeEventListener('online', this.handleOnline);
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.removeEventListener('message', this.handleSwMessage);
        }
        
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
