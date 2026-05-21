import template from "./chats.hbs";
import { BasePage, IBasePageProps } from "../../core/base/basePage";
import { OnboardingEmpty } from "../../components/composite/onboardingEmpty/onboardingEmpty";
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { MenuBar, MenuButtonType } from "../../components/composite/menuBar/menuBar";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper";
import { Button } from "../../components/ui/button/button";
import { BaseComponent } from "../../core/base/baseComponent";
import { ChatWindow } from "../../components/composite/chatWindow/chatWindow";
import { DialogHeader } from "../../components/composite/dialogHeader/dialogHeader";
import { MessageList } from "../../components/composite/messageList/messageList";
import { MessageInput } from "../../components/ui/messageInput/messageInput";
import { Chat, FrontendMessage, DialogChat, GroupChat, ChannelChat, User } from '../../types/chat';
import type { ChannelRole } from "../../services/channelService";
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
import {
    MessageDto,
    MessageUpdateDto,
    MessageClearDto,
    ChatUpdatedAvatarDto,
    ChatUpdatedMembersDto,
    ChatUpdatedTitleDto,
    MessageReadDto,
} from "../../core/utils/wsClient";
import { MessageSearchBar } from "../../components/composite/messageSearchBar/messageSearchBar";
import { ChatsCoordinator } from "./controllers/chatsCoordinator";
import { ChatCreationController } from "./controllers/chatCreationController";
import { ChatNotificationPromptController } from "./controllers/chatNotificationPromptController";
import { ChatPresenceController } from "./controllers/chatPresenceController";
import { ChatRealtimeController } from "./controllers/chatRealtimeController";
import { ChatSidebarController } from "./controllers/chatSidebarController";
import { chatsUseCases } from "./model/chatsUseCases";
import type { ActiveChatVM, ChatSearchType, CreateChatMode, CurrentUserVM } from "./model/chatsViewModels";
import { ChatsView } from "./chatsView";


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
    private onboardingComponent: OnboardingEmpty | null = null;
    
    public activeChatId: string | null = null;
    private activeChat: Chat | null = null;
    private messageSearchBar: MessageSearchBar | null = null;
    private currentUserId: number | null = null;
    private hasMoreHistory: boolean = false;
    private nextBeforeId: number | null = null;
    private currentUserProfile: FrontendProfile | null = null;
    private searchTabsEl: HTMLElement | null = null;

    /** ID текущего запроса истории (используется для защиты от гонок). */
    private historyRequestId = 0;
    /** ID текущего вызова openChat (защита от race condition при быстром переключении чатов). */
    private openChatRequestId = 0;

    /**
     * Ссылка на активный MessageList-компонент.
     * Хранится отдельно для доступа из WS-обработчика сообщений.
     */
    private activeMessageList: MessageList | null = null;
    private activeMessageInput: MessageInput | null = null;
    private activeGroupHeader: GroupHeader | null = null;
    private activeChannelHeader: ChannelHeader | null = null;
    private activeChannelRole: ChannelRole | null = null;
    private chatsCoordinator: ChatsCoordinator | null = null;
    private creationController: ChatCreationController | null = null;
    private presenceController: ChatPresenceController | null = null;
    private notificationPromptController: ChatNotificationPromptController | null = null;
    private realtimeController: ChatRealtimeController | null = null;
    private sidebarController: ChatSidebarController | null = null;
    private chatsView: ChatsView | null = null;

    /**
     * Обработчик глобальных нажатий клавиш.
     * Закрывает текущий чат или всплывающие окна по нажатию Escape.
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            if (this.messageSearchBar) {
                this.closeMessageSearch();
                return;
            }
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
        const dtoChatId = dto.chat_id.toString();
        const isStillActiveChat = () => this.activeChatId !== null && dtoChatId === this.activeChatId;

        // Уведомления (OS + звук) теперь обрабатывает глобальный notificationService.attach()
        // — он подписан на message.New на app-уровне и работает на любой странице.

        if (!isStillActiveChat()) return;
        if (!this.activeMessageList || this.currentUserId === null) return;

        const currentUserId = this.currentUserId;
        const tempId = await chatsUseCases.resolveRealtimeMessage(dto, currentUserId);
        if (!isStillActiveChat() || !this.activeMessageList) return;

        const serverTime = dto.created_at ? new Date(dto.created_at) : undefined;
        if (tempId && this.activeMessageList.replaceMessageId(tempId, dto.id.toString(), serverTime)) {
            return;
        }

        const frontendMsg = this.activeChat
            ? await chatsUseCases.enrichMessageForChat(
                this.activeChat,
                chatsUseCases.mapRealtimeMessage(dto, currentUserId),
                currentUserId,
            )
            : chatsUseCases.mapRealtimeMessage(dto, currentUserId);
        if (!isStillActiveChat() || !this.activeMessageList) return;

        this.activeMessageList.addMessage(frontendMsg);

        // если входящее сообщение и я смотрю на чат — сразу отмечаю как прочитанное
        if (!frontendMsg.isOwn) {
            chatsUseCases.markMessageRead(dtoChatId, dto.id.toString());
        }
    };

    private readonly handleMessageEdited = (dto: MessageUpdateDto): void => {
        if (dto.last_message_edited) {
            this.chatWrapper?.updateChatLastMessageText(dto.chat_id.toString(), dto.text);
        }

        if (!this.activeChatId || dto.chat_id.toString() !== this.activeChatId) return;
        if (!this.activeMessageList) return;
        this.activeMessageList.updateMessage(dto.id.toString(), dto.text);
    };

    private readonly handleMessageDeleted = (dto: MessageClearDto): void => {
        const dtoChatId = dto.chat_id.toString();
        const isActiveChat = this.activeChatId === dtoChatId;

        if (isActiveChat && this.activeMessageList) {
            this.activeMessageList.deleteMessage(dto.id.toString());
        }

        if (dto.last_message_edited) {
            const newLast: FrontendMessage | undefined = dto.last_message
                ? {
                    id: '',
                    text: dto.last_message.text,
                    timestamp: new Date(dto.last_message.created_at),
                    sender: { id: dto.last_message.sender_id } as User,
                    isOwn: this.currentUserId !== null
                        && Number(dto.last_message.sender_id) === Number(this.currentUserId),
                }
                : undefined;
            this.chatWrapper?.setChatLastMessage(dtoChatId, newLast);
        }
    };

    private readonly handleActiveChatAvatarUpdated = (payload: ChatUpdatedAvatarDto): void => {
        if (!this.activeChatId || String(payload.chat_id) !== this.activeChatId) return;

        this.activeGroupHeader?.setAvatar(payload.avatar_url);
        this.activeChannelHeader?.setAvatar(payload.avatar_url);
        if (this.activeChat) {
            this.activeChat = { ...this.activeChat, avatarUrl: payload.avatar_url || undefined } as Chat;
        }
    };

    private readonly handleActiveChatTitleUpdated = (payload: ChatUpdatedTitleDto): void => {
        if (!this.activeChatId || String(payload.chat_id) !== this.activeChatId) return;

        this.activeGroupHeader?.setTitle(payload.title);
        this.activeChannelHeader?.setTitle(payload.title);
        if (this.activeChat) {
            this.activeChat = { ...this.activeChat, title: payload.title } as Chat;
        }
    };

    /**
     * Обработчик `chat.Updated.Members` — добавляет системное сообщение в открытый чат
     * вида «Иван Петров добавлен в чат» / «Иван Петров удалён из чата».
     * Только для активного чата; сайдбар-логика отдельно живёт в ChatListItem.
     */
    private readonly handleActiveChatMembersUpdated = (payload: ChatUpdatedMembersDto): void => {
        if (!this.activeChatId || String(payload.chat_id) !== this.activeChatId) return;
        const delta = payload.updated_members_id.length;
        this.activeGroupHeader?.applyMembersDelta(payload.type, delta);
        this.activeChannelHeader?.applySubscribersDelta(payload.type, delta);

        if (!this.activeMessageList) return;

        const name = payload.name?.trim() || 'Пользователь';
        const verb = payload.type === 'added' ? 'добавлен в чат' : 'удалён из чата';
        this.activeMessageList.addSystemMessage(`${name} ${verb}`);
    };

    /**
     * Обработчик `message.Read` — кто-то прочитал в чате до last_read_message_id включительно.
     * Если читатель — не я → обновляю «прочитано» на своих сообщениях с id <= last_read.
     */
    private readonly handleMessageRead = (dto: MessageReadDto): void => {
        if (!this.activeChatId || String(dto.chat_id) !== this.activeChatId) return;
        if (this.currentUserId === null) return;
        if (dto.reader_user_id === this.currentUserId) return;

        this.activeMessageList?.markOwnMessagesRead(dto.last_read_message_id);
    };

    /**
     * Обработчик системного события переподключения WS.
     * Перезапрашивает историю для активного чата и флашит offline-очередь.
     */
    private handleWsConnected = () => {
        void chatsUseCases.flushPendingMessages();
        if (this.activeChatId) {
            console.log('[ChatsPage] WS переподключен, запрашиваем свежую историю...');
            this.hasMoreHistory = false;
            this.nextBeforeId = null;
            void this.reloadActiveChatState(this.activeChatId);
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
        this.chatsView = new ChatsView(this.element);
        this.sidebarController = new ChatSidebarController({
            getActiveChatId: () => this.activeChatId,
            onChatsLoaded: (chats) => this.chatWrapper?.setChats(chats),
            onChatAdded: (chat) => this.chatWrapper?.addChat(chat),
            onChatUpdated: (chat) => this.chatWrapper?.updateChat(chat),
            onChatRemoved: (chatId) => this.chatWrapper?.removeChat(chatId),
            onChatMovedToTop: (chatId) => this.chatWrapper?.moveChatToTop(chatId),
            onActiveChatRemoved: () => this.props.router.navigate('/chats'),
            onSearchResults: (items) => this.chatWrapper?.showSearchResults(items),
            onRestoreChatList: () => this.chatWrapper?.restoreChatList(),
            onSearchActiveChange: (isActive) => {
                if (this.searchTabsEl) this.searchTabsEl.style.display = isActive ? 'flex' : 'none';
            },
        });
        this.creationController = new ChatCreationController({
            getCurrentUserId: () => this.currentUserId,
            onCreated: (chatId) => {
                this.rebuildSidebar();
                this.props.router.navigate(`/chats/${chatId}`);
            },
            onError: (message) => this.showAlert(message),
        });
        this.presenceController = new ChatPresenceController();
        this.notificationPromptController = new ChatNotificationPromptController({
            showPrompt: (handlers) => this.chatsView?.showNotificationPrompt(handlers),
        });
        this.realtimeController = new ChatRealtimeController({
            onNewMessage: this.handleNewMessage,
            onMessageUpdated: this.handleMessageEdited,
            onMessageDeleted: this.handleMessageDeleted,
            onMessageRead: this.handleMessageRead,
            onChatAvatarUpdated: this.handleActiveChatAvatarUpdated,
            onChatTitleUpdated: this.handleActiveChatTitleUpdated,
            onMembersUpdated: this.handleActiveChatMembersUpdated,
            onProfileUpdated: (payload) => {
                if (this.activeChat?.type === 'channel') return;
                this.activeMessageList?.updateUserAvatar(payload);
            },
            onConnected: this.handleWsConnected,
            onDisconnected: () => chatsUseCases.clearInFlightMessages(),
        });

        this.rebuildSidebar();

        try {
            const currentUser = await chatsUseCases.loadCurrentUser();
            this.currentUserProfile = currentUser.profile;
            this.currentUserId = currentUser.id;
            await this.sidebarController.loadSidebarChats(this.currentUserId, this.activeChatId);
            this.sidebarController.startRealtime(this.currentUserId);
        } catch (error) {
            console.error("ChatsPage: Не удалось получить профиль пользователя", error);
        }

        // wsClient.connect() и notificationService.attach() теперь живут на app-уровне
        // (см. App.start() / authService.login). Здесь только page-specific подписки.

        this.realtimeController.startPageRealtime();

        this.chatsCoordinator = new ChatsCoordinator({
            showRoot: () => this.showChatsRoot(),
            openChat: (chatId) => this.showChatRoute(chatId),
            openCreate: (mode) => this.showCreateChatRoute(mode),
            openInvalid: () => this.props.router.navigate('/chats'),
            afterRoute: () => this.syncMobileLayoutState(),
        });

        await this.chatsCoordinator.init(this.getCurrentPath());

        document.addEventListener('keydown', this.handleKeyDown);

        this.notificationPromptController.maybeShow();

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
        await this.chatsCoordinator?.routeTo(this.getCurrentPath());
    }

    /**
     * Очищает основную контентную область (правую панель).
     * Размонтирует активное окно чата или окно создания чата,
     * чтобы избежать наложения интерфейсов и утечек памяти.
     * @private
     */
    private toggleMessageSearch(chat: Chat): void {
        if (this.messageSearchBar) {
            this.closeMessageSearch();
        } else {
            this.openMessageSearch(chat);
        }
    }

    private openMessageSearch(chat: Chat): void {
        if (!this.chatWindow?.element || this.currentUserId === null) return;
        const slot = this.chatWindow.element.querySelector('[data-component="chat-search-slot"]');
        if (!slot) return;

        this.messageSearchBar = new MessageSearchBar({
            chatId: chat.id,
            chatType: chat.type,
            currentUserId: this.currentUserId,
            onClose: () => this.closeMessageSearch(),
            onSearch: (query, beforeId) => chatsUseCases.searchMessages(chat.id, query, this.currentUserId!, beforeId ?? null),
            onResults: (query) => {
                this.activeMessageList?.setHighlightQuery(query);
            },
            onJumpTo: (messageId) => this.jumpToMessage(messageId),
            getLoadedMessages: () => this.activeMessageList?.getLoadedMessages() ?? [],
        });
        this.messageSearchBar.mount(slot as HTMLElement);
    }

    private closeMessageSearch(): void {
        this.messageSearchBar?.unmount();
        this.messageSearchBar = null;
        this.activeMessageList?.setHighlightQuery('');
    }

    private async jumpToMessage(messageId: string): Promise<void> {
        if (!this.activeMessageList) return;

        if (this.activeMessageList.scrollToMessage(messageId)) return;

        let iterations = 0;
        const MAX_ITERATIONS = 5;

        while (iterations < MAX_ITERATIONS && this.hasMoreHistory && this.nextBeforeId && this.activeChat && this.currentUserId) {
            const res = await chatsUseCases.loadMoreMessages(this.activeChat, this.currentUserId, this.nextBeforeId);
            if (!res) break;

            this.hasMoreHistory = res.hasMore;
            this.nextBeforeId = res.nextBeforeId;
            this.activeMessageList.prependMessages(res.messages);

            if (this.activeMessageList.scrollToMessage(messageId)) return;
            iterations++;
        }
    }

    private cleanupMainContent(): void {
        this.realtimeController?.stopActiveChatRealtime();
        this.presenceController?.stop();
        this.activeMessageList = null;
        this.activeMessageInput = null;
        this.activeChat = null;
        this.activeGroupHeader = null;
        this.activeChannelHeader = null;
        this.activeChannelRole = null;

        this.sidebarController?.cancelPendingSearch();

        if (this.messageSearchBar) {
            this.messageSearchBar.unmount();
            this.messageSearchBar = null;
        }

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
        this.chatsView?.hidePlaceholder();
        if (this.onboardingComponent) {
            this.onboardingComponent.unmount();
            this.onboardingComponent = null;
        }
        this.chatsView?.closeModal();
    }

    private buildSearchTabs(): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'chats-search-tabs';
        wrap.innerHTML = `
            <button type="button" class="chats-search-tabs__btn chats-search-tabs__btn--active" data-type="">Чаты</button>
            <button type="button" class="chats-search-tabs__btn" data-type="group">Группы</button>
            <button type="button" class="chats-search-tabs__btn" data-type="channel">Каналы</button>
        `;
        wrap.style.display = 'none';
        wrap.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chats-search-tabs__btn');
            if (!btn) return;
            const type = (btn.dataset.type ?? '') as ChatSearchType;
            if (type === this.sidebarController?.getSearchType()) return;
            this.sidebarController?.setSearchType(type);

            wrap.querySelectorAll('.chats-search-tabs__btn').forEach(b =>
                b.classList.toggle('chats-search-tabs__btn--active', b === btn)
            );
        });
        return wrap;
    }

    private handleSearchInput = (query: string): void => {
        this.sidebarController?.handleSearchInput(query);
    };

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
        this.chatsView?.mountInRoot(this.onboardingComponent);
    }

    /**
     * Обрабатывает внутреннюю навигацию на странице чатов.
     * Анализирует URL и решает, что отобразить: плейсхолдер,
     * существующий чат или окно создания нового чата.
     * @private
     */
    private getCurrentPath(): string {
        return this.props.currentPath || window.location.pathname;
    }

    private async showChatsRoot(): Promise<void> {
        this.cleanupMainContent();
        this.activeChatId = null;
        this.chatWrapper?.setActiveChat(null);

        if (this.currentUserId !== null) {
            const obKey = `pulse_ob_closed_${this.currentUserId}`;
            if (!sessionStorage.getItem(obKey)) {
                try {
                    const hasChats = await chatsUseCases.hasAnyChats(this.currentUserId);
                    if (!hasChats) {
                        this.mountOnboarding(obKey);
                        return;
                    }
                } catch {
                    // не удалось проверить — показываем обычный плейсхолдер
                }
            }
        }

        this.chatsView?.showPlaceholder();
    }

    private async showChatRoute(chatId: string): Promise<void> {
        if (chatId !== this.activeChatId || !this.chatWindow) {
            this.cleanupMainContent();

            this.activeChatId = chatId;
            this.chatWrapper?.setActiveChat(chatId);
            await this.openChat(chatId);
        }
    }

    private async showCreateChatRoute(chatType: CreateChatMode): Promise<void> {
        this.cleanupMainContent();

        this.activeChatId = null;
        this.chatWrapper?.setActiveChat(null);

        await this.createChat(chatType);
    }

    /**
     * На узких экранах переключает вид: список чатов или основная область (чат / создание / детали).
     */
    private syncMobileLayoutState(): void {
        this.chatsView?.syncMobileLayoutState({
            activeChatId: this.activeChatId,
            hasCreateWindow: this.createChatWindow !== null,
            hasGroupDetailsWindow: this.groupDetailsWindow !== null,
            hasChannelDetailsWindow: this.channelDetailsWindow !== null,
            hasAddMemberWindow: this.addMemberWindow !== null,
        });
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
        const sidebar = this.chatsView?.sidebarElement;
        if (!sidebar) return;

        this.searchForm?.unmount();
        this.chatWrapper?.unmount();
        this.menuBar?.unmount();
        this.logoutWrapper?.remove();

        sidebar.innerHTML = '';

        this.searchForm = new SearchForm({ 
            router: this.props.router,
            onSearch: this.handleSearchInput,
         });
        this.searchForm.mount(sidebar as HTMLElement);

        this.searchTabsEl = this.buildSearchTabs();
        sidebar.appendChild(this.searchTabsEl);

        this.chatWrapper = new ChatListWrapper({ 
            chats: this.sidebarController?.getChats() ?? [],
            activeChatId: this.activeChatId,
            onOpenChat: (chatId) => this.props.router.navigate(`/chats/${chatId}`),
        });
        this.chatWrapper.mount(sidebar as HTMLElement);

        if (this.currentUserId !== null) {
            void this.sidebarController?.loadSidebarChats(this.currentUserId, this.activeChatId);
        }

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
        if (!this.chatsView?.hasMainContentArea()) return;

        this.cleanupMainContent();

        switch (type) {
            case 'dialog':
                this.createChatWindow = new CreateDialogWindow({
                    router: this.props.router,
                    onSearchContacts: (query, scope) => this.creationController!.searchContacts(query, scope),
                    onSubmit: (contactId: number, _contactName: string) =>
                        this.creationController?.createDialog(contactId),
                });
                break;
            case 'group':
                this.createChatWindow = new CreateGroupWindow({
                    router: this.props.router,
                    contacts: await this.creationController!.loadContacts(),
                    onSubmit: (userIds: number[], groupName: string) =>
                        this.creationController?.createGroup(userIds, groupName),
                });
                break;
            case 'channel':
                this.createChatWindow = new CreateChannelWindow({
                    router: this.props.router,
                    onSubmit: (title: string, _avatar?: File) =>
                        this.creationController?.createChannel(title),
                });
                break;
            default:
                console.error("ChatsPage: Неизвестный тип создаваемого чата:", type);
                return;
        }

    if (this.createChatWindow) {
            this.chatsView.mountInMain(this.createChatWindow);
        }
    }

    private async getCurrentUserVM(): Promise<CurrentUserVM> {
        if (!this.currentUserProfile) {
            const currentUser = await chatsUseCases.loadCurrentUser();
            this.currentUserProfile = currentUser.profile;
            this.currentUserId = currentUser.id;
            return currentUser;
        }

        if (this.currentUserId === null) {
            this.currentUserId = this.currentUserProfile.additionalInfo.id;
        }

        const profile = this.currentUserProfile;
        return {
            id: this.currentUserId,
            login: profile.additionalInfo.login,
            displayName: [profile.mainInfo.firstName, profile.mainInfo.lastName].filter(Boolean).join(" ")
                || profile.additionalInfo.login,
            avatarUrl: profile.mainInfo.avatarUrl,
            profile,
        };
    }

    private restorePendingMessagesFromState(pendingMessages: ActiveChatVM["pendingMessages"]): void {
        if (!this.activeMessageList || this.currentUserId === null) return;
        if (pendingMessages.length === 0) return;

        pendingMessages.forEach((pending) => {
            this.activeMessageList?.addMessage({
                id: pending.tempId,
                sender: {
                    id: pending.senderId,
                    login: this.currentUserProfile?.additionalInfo.login || '',
                    avatarUrl: this.currentUserProfile?.mainInfo.avatarUrl,
                    firstName: this.currentUserProfile?.mainInfo.firstName,
                    lastName: this.currentUserProfile?.mainInfo.lastName,
                },
                text: pending.text,
                timestamp: new Date(pending.createdAt),
                isOwn: true,
                status: 'sending',
            });
        });
    }

    /**
     * Открывает и отображает окно существующего чата по его ID.
     * Загружает детали чата и его сообщения, затем инициализирует
     * `ChatWindow` с соответствующими компонентами (шапка, список сообщений, поле ввода).
     * @param {string} chatId - ID чата для открытия.
     * @private
     */
    private async openChat(chatId: string): Promise<void> {
        if (!this.chatsView?.hasMainContentArea()) return;

        const reqId = ++this.openChatRequestId;
        const isCancelled = () => reqId !== this.openChatRequestId || this.activeChatId !== chatId;

        try {
            const currentUser = await this.getCurrentUserVM();
            if (isCancelled()) return;

            const activeState = await chatsUseCases.loadActiveChat(chatId, currentUser);
            if (isCancelled()) return;

            if (!activeState) {
                this.props.router.navigate('/chats');
                return;
            }
            this.cleanupMainContent();

            const chatDetail = activeState.chat;
            this.activeChat = chatDetail;
            this.hasMoreHistory = activeState.hasMoreHistory;
            this.nextBeforeId = activeState.nextBeforeId;
            this.activeChannelRole = activeState.header.type === 'channel'
                ? activeState.header.currentUserRole
                : null;

            let headerComponent: BaseComponent;
            let footerComponent: BaseComponent | undefined;
            const canWriteActiveChat = activeState.permissions.canWrite;
            const canJoinActiveChat = activeState.permissions.canJoin;

            switch (chatDetail.type) {
            case 'dialog': {
                const dialogChat = chatDetail as DialogChat;
                const interlocutorLogin = dialogChat.interlocutor.login || String(dialogChat.interlocutor.id);
                const dialogHeader = new DialogHeader({
                    chat: dialogChat,
                    initialPresence: activeState.header.type === 'dialog' ? activeState.header.presence : null,
                    onOpenProfile: () => this.props.router.navigate('/contacts/' + interlocutorLogin),
                    onOpenSearch: () => this.toggleMessageSearch(chatDetail),
                    onDeleteChat: async() => {
                        const res = await chatsUseCases.deleteChat(chatId);
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
                headerComponent = dialogHeader;
                if (dialogChat.interlocutor.id) {
                    this.presenceController?.watchDialogInterlocutor(
                        dialogChat.interlocutor.id,
                        (state) => dialogHeader.setPresence(state),
                    );
                }
                break;
            }

            case 'group': {
                const groupRole = activeState.header.type === 'group'
                    ? activeState.header.currentUserRole
                    : 'member';
                (chatDetail as GroupChat).currentUserRole = groupRole;
                const groupHeader = new GroupHeader({
                    chat: chatDetail as GroupChat,
                    currentUserRole: groupRole,
                    membersCount: activeState.header.type === 'group' ? activeState.header.membersCount : 0,
                    onOpenSearch: () => this.toggleMessageSearch(chatDetail),
                    onDeleteChat: async () => {
                        const res = await chatsUseCases.deleteChat(chatId);
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
                    onLeaveGroup: async () => {
                        const res = await chatsUseCases.leaveChat(Number(chatId));
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            this.showAlert("Не удалось выйти из группы");
                        }
                    },
                    onOpenGroupInfo: () => this.openGroupDetails(chatDetail as GroupChat)
                });
                this.activeGroupHeader = groupHeader;
                headerComponent = groupHeader;
                break;
            }

            case 'channel': {
                const channelRole = activeState.header.type === 'channel'
                    ? activeState.header.currentUserRole
                    : 'guest';

                const channelHeader = new ChannelHeader({
                    chat: chatDetail as ChannelChat,
                    currentUserRole: channelRole,
                    onDeleteChat: async () => {
                        const res = await chatsUseCases.deleteChannel(chatId);
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
                        if (channelRole !== 'participant') {
                            this.showAlert('Вы не подписаны на этот канал');
                            return;
                        }
                        const res = await chatsUseCases.leaveChannel(chatId);
                        if (res.success) {
                            this.activeChatId = null;
                            this.rebuildSidebar();
                            this.props.router.navigate('/chats');
                        } else {
                            this.showAlert('Не удалось покинуть канал');
                        }
                    },
                    onOpenChannelInfo: () => this.openChannelDetails(chatDetail as ChannelChat),
                    onOpenSearch: () => this.toggleMessageSearch(chatDetail),
                });
                this.activeChannelHeader = channelHeader;
                headerComponent = channelHeader;
                break;
            }
            }

            const messageListComponent = new MessageList({
            messages: activeState.messages,
            currentUser: {
                id: activeState.currentUser.id,
                login: activeState.currentUser.login,
                avatarUrl: activeState.currentUser.avatarUrl
            },
            chatType: chatDetail.type,
            chatAvatarUrl: chatDetail.type === 'channel' ? (chatDetail.avatarUrl || undefined) : undefined,
            onLoadMore: async () => {
                if (!this.hasMoreHistory || !this.nextBeforeId || !this.currentUserId || !this.activeChatId) return;

                const res = await chatsUseCases.loadMoreMessages(chatDetail, this.currentUserId as number, this.nextBeforeId);

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
            onRequestDelete: (messageId) => {
                if (!this.activeChatId) return;
                const ok = chatsUseCases.deleteMessage(this.activeChatId, messageId);
                if (!ok) {
                    this.showAlert?.('No connection, try later');
                }
            },
            });

            this.activeMessageList = messageListComponent;

            if (canWriteActiveChat) {
                const messageInputComponent = new MessageInput({
                    onSubmit: async (text: string) => {
                        if (!this.activeChatId || this.currentUserId === null) return;
                        if (chatDetail.type === 'channel' && this.activeChannelRole !== 'owner') return;

                        const pending = await chatsUseCases.sendMessage(
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
                            status: 'sending',
                        };
                        this.activeMessageList?.addMessage(optimistic);
                    },
                    onSubmitEdit: (messageId, newText) => {
                        if (!this.activeChatId) return;
                        if (chatDetail.type === 'channel' && this.activeChannelRole !== 'owner') return;
                        const ok = chatsUseCases.editMessage(this.activeChatId, messageId, newText);
                        if (!ok) {
                            this.showAlert?.('No connection, try later');
                        }
                    },
                    onTyping: () => {
                        if (this.activeChatId) this.presenceController?.emitTyping(this.activeChatId);
                    },
                    onStopTyping: () => {
                        if (this.activeChatId) this.presenceController?.stopTyping(this.activeChatId);
                    },
                    chatId: this.activeChatId
                });
                this.activeMessageInput = messageInputComponent;
                footerComponent = messageInputComponent;
            } else if (canJoinActiveChat) {
                footerComponent = new ChannelJoinFooter({
                    onJoin: () => this.handleJoinChannel(chatId),
                });
            }

            if (isCancelled()) return;

            this.chatWindow = new ChatWindow({
                headerComponent: headerComponent,
                messageListComponent: messageListComponent,
                inputComponent: footerComponent
            });

            this.chatsView.mountInMain(this.chatWindow);

            this.realtimeController?.startActiveChatRealtime();

            if (canWriteActiveChat && activeState.permissions.canRestorePending) {
                this.restorePendingMessagesFromState(activeState.pendingMessages);
            }

            // отмечаем прочитанным последнее входящее сообщение при открытии чата
            const last = this.activeMessageList?.getLatestMessageData();
            if (last && !last.isOwn && /^\d+$/.test(last.id)) {
                chatsUseCases.markMessageRead(chatId, last.id);
            }
        } finally {
            this.syncMobileLayoutState();
        }
    }

    private async handleJoinChannel(chatId: string): Promise<void> {
        const res = await chatsUseCases.joinChannel(chatId);
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

    private async reloadActiveChatState(chatId: string): Promise<void> {
        if (!this.activeMessageList) return;
        const reqId = ++this.historyRequestId;
        const currentUser = await this.getCurrentUserVM();
        const activeState = await chatsUseCases.loadActiveChat(chatId, currentUser);

        if (!activeState || this.activeChatId !== chatId || reqId !== this.historyRequestId) {
            return;
        }

        this.hasMoreHistory = activeState.hasMoreHistory;
        this.nextBeforeId = activeState.nextBeforeId;
        this.activeChat = activeState.chat;
        this.activeMessageList.setMessages(activeState.messages);

        if (activeState.permissions.canWrite && activeState.permissions.canRestorePending) {
            this.restorePendingMessagesFromState(activeState.pendingMessages);
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
        if (!this.chatsView?.hasMainContentArea() || this.currentUserId === null) return;

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

        let groupDetails;
        try {
            groupDetails = await chatsUseCases.loadGroupDetails(chat, this.currentUserId);
        } catch {
            if (this.chatWindow?.element) {
                this.chatWindow.element.style.display = 'flex';
            }
            this.syncMobileLayoutState();
            this.showAlert('Не удалось загрузить информацию о группе');
            return;
        }

        const members = groupDetails.members.map(member => ({
            id: member.id,
            name: member.displayName,
            avatarUrl: member.avatarUrl || '/assets/images/avatars/defaultAvatar.svg'
        }));

        this.groupDetailsWindow = new GroupDetailsWindow({
            groupId: groupDetails.id,
            groupName: groupDetails.title,
            groupAvatarUrl: groupDetails.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
            currentUserRole: groupDetails.currentUserRole,
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
            onUpdateGroup: (newName?: string, newAvatar?: File) => {
                return chatsUseCases.updateGroup(chat.id, newName, newAvatar);
            },
            onLeaveGroup: async () => {
                const res = await chatsUseCases.leaveGroup(chat.id);
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
                const res = await chatsUseCases.removeGroupMember(chat.id, userId);
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
                const memberLogin = await chatsUseCases.getProfileLogin(userId);
                this.props.router.navigate(`/contacts/${memberLogin}`);
            }
        });

        this.chatsView.mountInMain(this.groupDetailsWindow);
        this.syncMobileLayoutState();
    }
    /**
     * Открывает окно деталей канала поверх чата.
     * Загружает свежие данные через use-case слой, монтирует ChannelDetailsWindow.
     */
    private async openChannelDetails(chat: ChannelChat): Promise<void> {
        if (!this.chatsView?.hasMainContentArea() || this.currentUserId === null) return;

        if (this.channelDetailsWindow) {
            this.channelDetailsWindow.unmount();
            this.channelDetailsWindow = null;
        }

        if (this.chatWindow?.element) {
            this.chatWindow.element.style.display = 'none';
        }

        const channelDetail = await chatsUseCases.loadChannelDetails(chat, this.currentUserId);
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
                const res = await chatsUseCases.leaveChannel(chat.id);
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
                const res = await chatsUseCases.deleteChannel(chat.id);
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
                return chatsUseCases.updateChannel(chat.id, { title, description, avatar }, this.currentUserId);
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
                const res = await chatsUseCases.removeChannelMember(chat.id, userId);
                if (!res.success) {
                    this.showAlert('Не удалось удалить участника', () => {
                        this.openChannelDetails(chat);
                    });
                    return false;
                }
                return true;
            },
            onMemberClick: async (userId: number) => {
                const memberLogin = await chatsUseCases.getProfileLogin(userId);
                this.props.router.navigate(`/contacts/${memberLogin}`);
            },
        });

        this.chatsView.mountInMain(this.channelDetailsWindow);
        this.syncMobileLayoutState();
    }

    /**
     * Открывает окно добавления участника в группу по логину.
     * Прячет окно деталей группы и показывает форму поиска пользователя.
     * @param chat — Объект группового чата, в который добавляем участника.
     */
    private openAddMemberWindow(chat: GroupChat): void {
        if (!this.chatsView?.hasMainContentArea()) return;

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

                const targetUserRes = await chatsUseCases.getUserIdByLogin(login);

                if (targetUserRes.status === 404 || !targetUserRes.id) {
                    return `Пользователь с логином "${login}" не найден!`;
                }

                const res = await chatsUseCases.addMembersToGroup(chat.id, [targetUserRes.id]);

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

        this.chatsView.mountInMain(this.addMemberWindow);
        this.syncMobileLayoutState();
    }

    /**
     * Выполняется перед размонтированием страницы.
     * Очищает все дочерние компоненты и сбрасывает состояние.
     * @protected
     */
    beforeUnmount() {
        this.chatsCoordinator?.destroy();
        this.chatsCoordinator = null;
        this.creationController = null;
        this.presenceController?.destroy();
        this.presenceController = null;
        this.notificationPromptController = null;
        this.sidebarController?.destroy();
        this.sidebarController = null;
        this.realtimeController?.destroy();
        this.realtimeController = null;

        this.onboardingComponent?.unmount();
        this.onboardingComponent = null;
        this.cleanupMainContent();
        this.chatsView?.closeModal();
        this.logoutWrapper?.remove();
        this.searchForm?.unmount();
        this.chatWrapper?.unmount();
        this.menuBar?.unmount();
        this.logoutButton?.unmount();
        
        // WS-коннект НЕ рвём — он живёт на app-уровне, нужен для уведомлений на других страницах.

        // Отписываемся от глобального события
        document.removeEventListener('keydown', this.handleKeyDown);

        this.element?.querySelector('.chat-page__mobile-back')
            ?.removeEventListener('click', this.handleMobileBack);

        this.activeChatId = null;
        this.chatsView?.destroy();
        this.chatsView = null;
    }

    private showAlert(text: string, onConfirm?: () => void): void {
        this.chatsView?.showAlert(text, onConfirm);
    }

}
