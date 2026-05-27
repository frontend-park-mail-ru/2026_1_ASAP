import template from "./chats.hbs";
import { BasePage, type IBasePageProps } from "../../core/base/basePage";
import { OnboardingEmpty } from "../../components/composite/onboardingEmpty/onboardingEmpty";
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { MenuBar, type MenuButtonType } from "../../components/composite/menuBar/menuBar";
import { ChatListWrapper } from "../../components/composite/chatListWrapper/chatListWrapper";
import { Button } from "../../components/ui/button/button";
import type { BaseComponent } from "../../core/base/baseComponent";
import { ChatWindow } from "../../components/composite/chatWindow/chatWindow";
import { ChatSkeleton } from "../../components/composite/chatSkeleton/chatSkeleton";
import { subscriptionService } from "../../services/subscriptionService";
import { chatService } from "../../services/chatService";
import { SearchTabs, type SearchTab } from "../../components/composite/searchTabs/searchTabs";
import type { MessageList } from "../../components/composite/messageList/messageList";
import type { MessageInput } from "../../components/ui/messageInput/messageInput";
import type { Chat, FrontendMessage, User } from '../../types/chat';
import type { ChannelRole } from "../../services/channelService";
import type { GroupHeader } from "../../components/composite/groupHeader/groupHeader";
import type { ChannelHeader } from "../../components/composite/channelHeader/channelHeader";
import type { FrontendProfile } from "../../types/profile";
import type {
    MessageDto,
    MessageUpdateDto,
    MessageClearDto,
    ChatUpdatedAvatarDto,
    ChatUpdatedMembersDto,
    ChatUpdatedTitleDto,
    LastMessageDto,
    MessageReadDto,
    WsErrorDto,
    VoiceTranscriptDto,
} from "../../core/utils/wsClient";
import { parseVoiceTranscript } from "../../core/utils/wsClient";
import { ChatActiveHeaderController } from "./controllers/chatActiveHeaderController";
import { ChatActiveMessagesController } from "./controllers/chatActiveMessagesController";
import { ChatCreateWindowController } from "./controllers/chatCreateWindowController";
import { ChatsCoordinator } from "./controllers/chatsCoordinator";
import { ChatCreationController } from "./controllers/chatCreationController";
import { ChatDetailsController } from "./controllers/chatDetailsController";
import { ChatDetailsFlowController } from "./controllers/chatDetailsFlowController";
import { ChatMessageSearchController } from "./controllers/chatMessageSearchController";
import { ChatNotificationPromptController } from "./controllers/chatNotificationPromptController";
import { ChatPresenceController } from "./controllers/chatPresenceController";
import { ChatRealtimeController } from "./controllers/chatRealtimeController";
import { ChatSessionController } from "./controllers/chatSessionController";
import { ChatSidebarController } from "./controllers/chatSidebarController";
import { getChatErrorMessage, type ServiceErrorLike } from "./model/chatsErrors";
import type { CreateChatMode, CurrentUserVM } from "./model/chatsViewModels";
import { ChatsView } from "./chatsView";
import { contactService } from "../../services/contactService";


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
    private chatSkeleton: ChatSkeleton | null = null;
    private onboardingComponent: OnboardingEmpty | null = null;
    
    public activeChatId: string | null = null;
    private activeChat: Chat | null = null;
    private currentUserId: number | null = null;
    private hasMoreHistory: boolean = false;
    private nextBeforeId: number | null = null;
    private currentUserProfile: FrontendProfile | null = null;
    private searchTabs: SearchTabs | null = null;

    /** ID текущего запроса истории (используется для защиты от гонок). */
    private historyRequestId = 0;
    /** ID текущего вызова openChat (защита от race condition при быстром переключении чатов). */
    private openChatRequestId = 0;
    /** ID текущего async-flow создания чата (защита от монтирования после смены route). */
    private createChatRequestId = 0;

    /**
     * Ссылка на активный MessageList-компонент.
     * Хранится отдельно для доступа из WS-обработчика сообщений.
     */
    private activeMessageList: MessageList | null = null;
    private activeMessageInput: MessageInput | null = null;
    private activeGroupHeader: GroupHeader | null = null;
    private activeChannelHeader: ChannelHeader | null = null;
    private activeChannelRole: ChannelRole | null = null;
    private activeHeaderController: ChatActiveHeaderController | null = null;
    private activeMessagesController: ChatActiveMessagesController | null = null;
    private chatsCoordinator: ChatsCoordinator | null = null;
    private creationController: ChatCreationController | null = null;
    private createWindowController: ChatCreateWindowController | null = null;
    private detailsController: ChatDetailsController | null = null;
    private detailsFlowController: ChatDetailsFlowController | null = null;
    private messageSearchController: ChatMessageSearchController | null = null;
    private presenceController: ChatPresenceController | null = null;
    private notificationPromptController: ChatNotificationPromptController | null = null;
    private realtimeController: ChatRealtimeController | null = null;
    private sessionController: ChatSessionController | null = null;
    private sidebarController: ChatSidebarController | null = null;
    /** Снимок unreadCount каждого чата на момент его открытия — нужен MessageList
     *  для якоря «Новые сообщения», т.к. resetUnread() обнуляет счётчик сразу. */
    private pendingUnreadForOpen: Map<string, number> = new Map();
    private chatsView: ChatsView | null = null;

    /**
     * Обработчик глобальных нажатий клавиш.
     * Закрывает текущий чат или всплывающие окна по нажатию Escape.
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            if (this.messageSearchController?.isOpen()) {
                this.messageSearchController.close();
                return;
            }
            if (this.activeChatId || this.createChatWindow || this.detailsFlowController?.hasOpenWindow()) {
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

        const currentUserId = this.currentUserId;

        const serverTime = dto.created_at ? new Date(dto.created_at) : undefined;
        if (tempId && this.activeMessageList.replaceMessageId(tempId, dto.id.toString(), serverTime)) {
            const frontendMsg = this.sessionController!.mapRealtimeMessage(dto, currentUserId);
            const messageComponent = this.activeMessageList.getMessageComponent(dto.id.toString());
            if (messageComponent && frontendMsg.attachments) {
                messageComponent.updateAttachments(frontendMsg.attachments);
            }
            return;
        }
        // A: снимаем pending из очереди для ЛЮБОГО чата, не только активного.
        // Иначе, если эхо пришло, когда чат закрыт, заглушка зависнет и будет
        // переотправляться на каждом reconnect/refresh.
        const tempId = currentUserId !== null
            ? await this.sessionController!.resolveRealtimeMessage(dto, currentUserId)
            : null;

        if (!isStillActiveChat() || !this.activeMessageList || currentUserId === null) return;

        // C: строим серверную версию сообщения и либо ЗАМЕНЯЕМ ею заглушку
        // (перенимая отцензуренный текст + isBlur), либо добавляем как новое.
        const frontendMsg = this.activeChat
            ? await this.sessionController!.enrichMessageForChat(
                this.activeChat,
                this.sessionController!.mapRealtimeMessage(dto, currentUserId),
                currentUserId,
            )
            : this.sessionController!.mapRealtimeMessage(dto, currentUserId);
        if (!isStillActiveChat() || !this.activeMessageList) return;

        if (tempId && this.activeMessageList.replaceMessage(tempId, frontendMsg)) {
            return;
        }

        // Дубль-эхо: это сообщение уже было сматчено ранее (повторная отправка после
        // флапа соединения; бэк без дедупа создал вторую строку). Не рисуем второй пузырь.
        if (dto.temp_id && chatService.wasRecentlyReconciled(dto.temp_id)) {
            return;
        }

        this.activeMessageList.addMessage(frontendMsg);

        // если входящее сообщение и я смотрю на чат — сразу отмечаю как прочитанное
        if (!frontendMsg.isOwn && this.activeChannelRole !== "guest") {
            this.sessionController!.markMessageRead(dtoChatId, dto.id.toString());
        }
    };

    private readonly handleMessageEdited = (dto: MessageUpdateDto): void => {
        if (dto.last_message_edited) {
            if (dto.last_message) {
                this.chatWrapper?.setChatLastMessage(dto.chat_id.toString(), this.toSidebarLastMessage(dto.last_message));
            } else {
                this.chatWrapper?.updateChatLastMessageText(dto.chat_id.toString(), dto.text);
            }
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
            const newLast = dto.last_message ? this.toSidebarLastMessage(dto.last_message) : undefined;
            this.chatWrapper?.setChatLastMessage(dtoChatId, newLast);
        }
    };

    private toSidebarLastMessage(lastMessage: LastMessageDto): FrontendMessage {
        return {
            id: '',
            text: lastMessage.text,
            timestamp: new Date(lastMessage.created_at),
            sender: { id: lastMessage.sender_id } as User,
            isOwn: this.currentUserId !== null
                && Number(lastMessage.sender_id) === Number(this.currentUserId),
            attachments: lastMessage.attachments?.map(attachment => ({
                type: attachment.type,
                url: attachment.url,
                fileName: attachment.file_name,
                mimeType: attachment.mime_type,
                fileSize: attachment.file_size,
                contactUserId: attachment.contact_user_id,
                contactFirstName: attachment.contact_first_name,
                contactLastName: attachment.contact_last_name,
                contactAvatarUrl: attachment.contact_avatar_url,
                isBlur: attachment.is_blur,
            })),
        };
    }

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
        if (this.currentUserId === null) return;

        // Я прочитал (возможно — в другой вкладке): синхронизируем sidebar и
        // обновляем lastReadMessageId, чтобы при следующем открытии чата
        // правильно сработал якорь «Новые сообщения».
        if (dto.reader_user_id === this.currentUserId) {
            this.sidebarController?.applyOwnRead(String(dto.chat_id), dto.last_read_message_id);
            return;
        }

        if (!this.activeChatId || String(dto.chat_id) !== this.activeChatId) return;
        this.activeMessageList?.markOwnMessagesRead(dto.last_read_message_id);
    };

    private readonly handleVoiceTranscript = (dto: VoiceTranscriptDto): void => {
        if (!this.activeChatId || String(dto.chat_id) !== this.activeChatId) return;
        if (!this.activeMessageList) return;

        const messageComponent = this.activeMessageList.getMessageComponent(String(dto.message_id));
        if (messageComponent) {
            const parsedTranscript = parseVoiceTranscript(dto.transcript);
            messageComponent.updateVoiceTranscript(dto.attachment_id, parsedTranscript);
        }
    };

    private readonly handleMessageError = async (payload: WsErrorDto): Promise<void> => {
        const errorChatId = payload.chat_id !== undefined ? String(payload.chat_id) : null;

        // Удаляем из локальной БД в любом случае
        const tempId = await this.sessionController?.rejectPendingMessageFromError(payload, this.activeChatId);

        // Игнорируем UI-обновления, если чат неактивен
        if (errorChatId && this.activeChatId && errorChatId !== this.activeChatId) return;

        const normErr = this.normalizeWsError(payload);
        const errorCode = normErr.errorCode;

        // Если это ошибка транскрипции голосового сообщения
        if (errorCode === 'SUBSCRIPTION_REQUIRED' || errorCode === 'TRANSCRIBER_FAILED' || errorCode === 'TRANSCRIBED_FAILED' || errorCode === 'TRANSCRIPTION_FAILED') {
            let errorText = 'Ошибка расшифровки';
            if (errorCode === 'SUBSCRIPTION_REQUIRED') {
                errorText = 'Нужна подписка';
            } else if (errorCode === 'TRANSCRIBER_FAILED' || errorCode === 'TRANSCRIBED_FAILED' || errorCode === 'TRANSCRIPTION_FAILED') {
                errorText = 'Не удалось расшифровать';
            }

            if (this.activeMessageList) {
                const messageId = payload.message_id !== undefined ? String(payload.message_id) : undefined;
                if (messageId) {
                    const messageComponent = this.activeMessageList.getMessageComponent(messageId);
                    if (messageComponent) {
                        const attachmentId = payload.attachment_id ? Number(payload.attachment_id) : 0;
                        if (errorCode === 'SUBSCRIPTION_REQUIRED') {
                            messageComponent.hideVoiceTranscriptButton(attachmentId);
                        }
                        messageComponent.setVoiceTranscriptError(attachmentId, errorText);
                        return;
                    }
                }
                
                // Резервный поиск активного лоадера
                this.activeMessageList.setVoiceTranscriptErrorForActiveLoading(errorText, errorCode === 'SUBSCRIPTION_REQUIRED');
            }
            return;
        }

        const message = getChatErrorMessage(
            "sendMessage",
            normErr,
            "Не удалось отправить сообщение",
        );

        if (tempId) {
            this.activeMessageList?.deleteMessage(tempId);
        }

        if (this.activeMessageInput) {
            this.activeMessageInput.showSendError(message);
            return;
        }

        this.showAlert(message);
    };

    private normalizeWsError(payload: WsErrorDto): ServiceErrorLike {
        const nestedError = typeof payload.error === 'object' ? payload.error : null;
        const firstError = payload.errors?.[0];

        return {
            errorCode: payload.code
                || payload.error_code
                || (typeof payload.error === 'string' ? payload.error : undefined)
                || nestedError?.code
                || firstError?.code,
            errorMessage: payload.message
                || nestedError?.message
                || firstError?.message,
        };
    }

    /**
     * Обработчик системного события переподключения WS.
     * Перезапрашивает историю для активного чата и флашит offline-очередь.
     */
    private handleWsConnected = () => {
        void this.sessionController!.flushPendingMessages();
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

        // Прогреваем статус подписки заранее: рендер сообщений с blur-флагом
        // спрашивает синхронно `isPremiumCached()`, чтобы не дёргать сеть на каждую картинку.
        void subscriptionService.primePremium();

        // Сообщение исчерпало попытки отправки → помечаем пузырь «не отправлено».
        chatService.setOnSendGaveUp((tempId) => {
            this.activeMessageList?.setMessageStatus(tempId, 'failed');
        });

        try {
            if (sessionStorage.getItem('pulse_first_login') === '1') {
                this.mountOnboarding('pulse_ob_closed_anonymous');
            }
        } catch {}

        this.sidebarController = new ChatSidebarController({
            getActiveChatId: () => this.activeChatId,
            onChatsLoaded: (chats) => this.chatWrapper?.setChats(chats),
            onChatAdded: (chat) => this.chatWrapper?.addChat(chat),
            onChatUpdated: (chat) => this.chatWrapper?.updateChat(chat),
            onChatRemoved: (chatId) => this.chatWrapper?.removeChat(chatId),
            onChatMovedToTop: (chatId) => this.chatWrapper?.moveChatToTop(chatId),
            onActiveChatRemoved: () => this.props.router.navigate('/chats'),
            onSearchResults: (result) => {
                if (result.tab === 'contact') {
                    this.chatWrapper?.showContactResults(
                        result.contacts?.local ?? [],
                        result.contacts?.global ?? [],
                    );
                } else {
                    this.chatWrapper?.showSearchResults(result.chats);
                }
            },
            onRestoreChatList: () => this.chatWrapper?.restoreChatList(),
            onSearchActiveChange: (isActive) => {
                this.searchTabs?.toggleVisible(isActive);
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
        this.createWindowController = new ChatCreateWindowController({
            creationController: this.creationController,
            router: this.props.router,
            onUnknownMode: (mode) => {
                console.error("ChatsPage: Неизвестный тип создаваемого чата:", mode);
            },
        });
        this.sessionController = new ChatSessionController();
        this.messageSearchController = new ChatMessageSearchController({
            sessionController: this.sessionController,
            getCurrentUserId: () => this.currentUserId,
            getSearchSlot: () => this.chatWindow?.element?.querySelector('[data-component="chat-search-slot"]') as HTMLElement | null,
            getMessageList: () => this.activeMessageList,
            getActiveChat: () => this.activeChat,
            getPaginationState: () => ({
                hasMoreHistory: this.hasMoreHistory,
                nextBeforeId: this.nextBeforeId,
            }),
            setPaginationState: (state) => {
                this.hasMoreHistory = state.hasMoreHistory;
                this.nextBeforeId = state.nextBeforeId;
            },
        });
        this.detailsController = new ChatDetailsController();
        this.detailsFlowController = new ChatDetailsFlowController({
            detailsController: this.detailsController,
            getCurrentUserId: () => this.currentUserId,
            getCurrentUserLogin: () => this.currentUserProfile?.additionalInfo.login ?? null,
            getChatWindowElement: () => this.chatWindow?.element ?? null,
            hasMainContentArea: () => this.chatsView?.hasMainContentArea() ?? false,
            mountInMain: (component) => this.chatsView?.mountInMain(component),
            syncLayout: () => this.syncMobileLayoutState(),
            showAlert: (text, onConfirm) => this.showAlert(text, onConfirm),
            rebuildSidebar: () => this.rebuildSidebar(),
            navigateChatsRoot: () => {
                this.activeChatId = null;
                this.props.router.navigate('/chats');
            },
            navigateContact: (login) => this.props.router.navigate(`/contacts/${login}`),
            refreshActiveChat: async () => {
                this.rebuildSidebar();
                if (this.activeChatId) {
                    await this.openChat(this.activeChatId);
                }
            },
        });
        this.activeHeaderController = new ChatActiveHeaderController({
            sessionController: this.sessionController,
            detailsController: this.detailsController,
            onChatClosed: () => {
                this.activeChatId = null;
                this.rebuildSidebar();
                this.props.router.navigate('/chats');
            },
            onNavigateToProfile: (login) => this.props.router.navigate('/contacts/' + login),
            onOpenSearch: (chat) => this.toggleMessageSearch(chat),
            onOpenGroupDetails: (chat) => this.detailsFlowController?.openGroupDetails(chat),
            onOpenChannelDetails: (chat) => this.detailsFlowController?.openChannelDetails(chat),
            onShowAlert: (text, onConfirm) => this.showAlert(text, onConfirm),
            onWatchDialogInterlocutor: (userId, onPresence) => {
                this.presenceController?.watchDialogInterlocutor(userId, onPresence);
            },
        });
        this.activeMessagesController = new ChatActiveMessagesController({
            sessionController: this.sessionController,
            getCurrentUserId: () => this.currentUserId,
            getCurrentUserProfile: () => this.currentUserProfile,
            getActiveChatId: () => this.activeChatId,
            getActiveChannelRole: () => this.activeChannelRole,
            getMessageList: () => this.activeMessageList,
            getMessageInput: () => this.activeMessageInput,
            getPaginationState: () => ({
                hasMoreHistory: this.hasMoreHistory,
                nextBeforeId: this.nextBeforeId,
            }),
            setPaginationState: (state) => {
                this.hasMoreHistory = state.hasMoreHistory;
                this.nextBeforeId = state.nextBeforeId;
            },
            onShowAlert: (text) => this.showAlert(text),
            onEmitTyping: (chatId) => this.presenceController?.emitTyping(chatId),
            onStopTyping: (chatId) => this.presenceController?.stopTyping(chatId),
            onJoinChannel: (chatId) => this.handleJoinChannel(chatId),
            onContactClick: async (userId) => {
                try {
                    const profileInfo = await contactService.getProfileInfo(userId);
                    if (profileInfo?.additionalInfo?.login) {
                        this.props.router.navigate('/contacts/' + profileInfo.additionalInfo.login);
                    }
                } catch (e) {
                    console.error("Failed to load profile for contact click", e);
                }
            },
            onPremiumRequired: () => this.props.router.navigate('/settings/subscription'),
            onRetryMessage: (tempId) => {
                this.activeMessageList?.setMessageStatus(tempId, 'sending');
                void chatService.retryMessage(tempId);
            },
            getPendingUnreadCount: (chatId) => this.pendingUnreadForOpen.get(chatId) ?? 0,
            getLastReadMessageId: (chatId) => {
                const chat = this.sidebarController?.getChats()
                    .find((c) => String(c.id) === String(chatId));
                return chat?.lastReadMessageId ?? 0;
            },
            onLocalMarkRead: (chatId, lastReadMessageId) => {
                this.sidebarController?.applyOwnRead(chatId, lastReadMessageId);
            },
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
            onVoiceTranscript: this.handleVoiceTranscript,
            onMessageError: this.handleMessageError,
            onConnected: this.handleWsConnected,
            onDisconnected: () => this.sessionController!.clearInFlightMessages(),
        });

        this.rebuildSidebar();

        try {
            const currentUser = await this.sessionController.loadCurrentUser();
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
        this.messageSearchController?.toggle(chat);
    }

    private cleanupMainContent(): void {
        this.createChatRequestId += 1;
        this.realtimeController?.stopActiveChatRealtime();
        this.presenceController?.stop();
        this.activeMessageList = null;
        this.activeMessageInput = null;
        this.activeChat = null;
        this.activeGroupHeader = null;
        this.activeChannelHeader = null;
        this.activeChannelRole = null;

        this.sidebarController?.cancelPendingSearch();

        this.messageSearchController?.close();

        if (this.chatWindow) {
            this.chatWindow.unmount();
            this.chatWindow = null;
        }
        if (this.createChatWindow) {
            this.createChatWindow.unmount();
            this.createChatWindow = null;
        }
        if (this.chatSkeleton) {
            this.chatSkeleton.unmount();
            this.chatSkeleton = null;
        }
        this.detailsFlowController?.closeAll();
        this.chatsView?.hidePlaceholder();
        if (this.onboardingComponent) {
            this.onboardingComponent.unmount();
            this.onboardingComponent = null;
        }
        this.chatsView?.closeModal();
    }

    private buildSearchTabs(): SearchTabs {
        return new SearchTabs({
            activeTab: 'dialog',
            onChange: (tab: SearchTab) => {
                this.sidebarController?.setSearchTab(tab);
            },
        });
    }

    private handleSearchInput = (query: string): void => {
        this.sidebarController?.handleSearchInput(query);
    };

    private mountChatSkeleton(chatId: string): void {
        if (!this.chatsView?.hasMainContentArea()) return;

        const chat = this.sidebarController?.getChats()
            .find((c) => String(c.id) === String(chatId));
        if (!chat) return;

        this.chatSkeleton = new ChatSkeleton({
            title: chat.title,
            avatarUrl: chat.avatarUrl,
        });
        this.chatsView.mountInMain(this.chatSkeleton);
    }

    private mountOnboarding(obKey: string): void {
        if (!this.element || this.onboardingComponent) return;
        this.onboardingComponent = new OnboardingEmpty({
            onComplete: () => {
                const finalKey = this.currentUserId !== null
                    ? `pulse_ob_closed_${this.currentUserId}`
                    : obKey;
                try { localStorage.setItem(finalKey, '1'); } catch {}
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

        if (this.shouldShowOnboarding()) {
            const obKey = this.currentUserId !== null
                ? `pulse_ob_closed_${this.currentUserId}`
                : 'pulse_ob_closed_anonymous';
            this.mountOnboarding(obKey);
            try { sessionStorage.removeItem('pulse_first_login'); } catch {}
            return;
        }

        this.chatsView?.showPlaceholder();
    }

    private shouldShowOnboarding(): boolean {
        if (this.currentUserId !== null) {
            const obKey = `pulse_ob_closed_${this.currentUserId}`;
            try {
                if (localStorage.getItem(obKey)) return false;
            } catch {}
        }

        const chatsInState = this.sidebarController?.getChats() ?? [];
        if (chatsInState.length > 0) {
            try { sessionStorage.removeItem('pulse_first_login'); } catch {}
            return false;
        }

        try {
            if (sessionStorage.getItem('pulse_first_login') === '1') return true;
        } catch {}

        return true;
    }

    private async showChatRoute(chatId: string): Promise<void> {
        if (chatId !== this.activeChatId || !this.chatWindow) {
            this.cleanupMainContent();

            // Снимаем unread ДО сброса — он нужен MessageList'у для якоря «Новые сообщения».
            const pendingUnread = this.sidebarController?.getChats()
                .find((c) => String(c.id) === String(chatId))?.unreadCount ?? 0;
            if (pendingUnread > 0) {
                this.pendingUnreadForOpen.set(chatId, pendingUnread);
            } else {
                this.pendingUnreadForOpen.delete(chatId);
            }

            this.activeChatId = chatId;
            this.chatWrapper?.setActiveChat(chatId);
            // Открыли чат — у него больше нет «непрочитанных» в превью.
            this.sidebarController?.resetUnread(chatId);

            this.mountChatSkeleton(chatId);

            await this.openChat(chatId);

            // Снимок использован — больше не нужен (повторные открытия без новых
            // входящих не должны якорить).
            this.pendingUnreadForOpen.delete(chatId);
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
        const detailsState = this.detailsFlowController?.getOpenState() ?? {
            hasGroupDetailsWindow: false,
            hasChannelDetailsWindow: false,
            hasAddMemberWindow: false,
        };

        this.chatsView?.syncMobileLayoutState({
            activeChatId: this.activeChatId,
            hasCreateWindow: this.createChatWindow !== null,
            ...detailsState,
        });
    }

    private readonly handleMobileBack = (): void => {
        if (
            this.activeChatId ||
            this.createChatWindow ||
            this.detailsFlowController?.hasOpenWindow()
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

        this.searchTabs = this.buildSearchTabs();
        this.searchTabs.mount(sidebar as HTMLElement);
        this.searchTabs.toggleVisible(false);

        this.chatWrapper = new ChatListWrapper({
            chats: this.sidebarController?.getChats() ?? [],
            activeChatId: this.activeChatId,
            onOpenChat: (chatId) => this.props.router.navigate(`/chats/${chatId}`),
            onOpenContact: (login) => this.props.router.navigate(`/contacts/${login}`),
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
    private async createChat(type: CreateChatMode) {
        if (!this.chatsView?.hasMainContentArea()) return;

        this.cleanupMainContent();
        const requestId = ++this.createChatRequestId;
        const createWindow = await this.createWindowController!.build(type);

        if (requestId !== this.createChatRequestId || !this.chatsView?.hasMainContentArea()) {
            createWindow?.unmount();
            return;
        }

        this.createChatWindow = createWindow;
        if (this.createChatWindow) {
            this.chatsView.mountInMain(this.createChatWindow);
        }
    }

    private async getCurrentUserVM(): Promise<CurrentUserVM> {
        if (!this.currentUserProfile) {
            const currentUser = await this.sessionController!.loadCurrentUser();
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

            const cachedChat = this.sidebarController?.getChats()
                .find((c) => String(c.id) === String(chatId)) ?? null;

            const activeState = await this.sessionController!.loadActiveChat(chatId, currentUser, cachedChat);
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

            const canWriteActiveChat = activeState.permissions.canWrite;

            const headerResult = this.activeHeaderController!.build(chatId, activeState);
            this.activeGroupHeader = headerResult.groupHeader;
            this.activeChannelHeader = headerResult.channelHeader;
            this.activeChannelRole = headerResult.channelRole;

            const messagesResult = this.activeMessagesController!.build(chatId, activeState);
            this.activeMessageList = messagesResult.messageListComponent;
            this.activeMessageInput = messagesResult.messageInputComponent;

            if (isCancelled()) return;

            this.chatWindow = new ChatWindow({
                headerComponent: headerResult.headerComponent,
                messageListComponent: messagesResult.messageListComponent,
                inputComponent: messagesResult.footerComponent,
                // DnD вложений по всему окну чата — только если в чат можно писать.
                onFilesDropped: canWriteActiveChat
                    ? (files) => this.activeMessageInput?.attachExternalFiles(files)
                    : undefined,
            });

            this.chatsView.mountInMain(this.chatWindow);

            this.realtimeController?.startActiveChatRealtime();

            if (canWriteActiveChat && activeState.permissions.canRestorePending) {
                this.activeMessagesController!.restorePendingMessages(activeState.pendingMessages);
            }

            this.activeMessagesController!.markLatestIncomingRead(chatId);
        } finally {
            this.syncMobileLayoutState();
        }
    }

    private async handleJoinChannel(chatId: string): Promise<void> {
        const res = await this.detailsController!.joinChannel(chatId);
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
        const activeState = await this.sessionController!.loadActiveChat(chatId, currentUser);

        if (!activeState || this.activeChatId !== chatId || reqId !== this.historyRequestId) {
            return;
        }

        this.hasMoreHistory = activeState.hasMoreHistory;
        this.nextBeforeId = activeState.nextBeforeId;
        this.activeChat = activeState.chat;
        this.activeMessageList.setMessages(activeState.messages);

        if (activeState.permissions.canWrite && activeState.permissions.canRestorePending) {
            this.activeMessagesController!.restorePendingMessages(activeState.pendingMessages);
        }
    }


    /**
     * Выполняется перед размонтированием страницы.
     * Очищает все дочерние компоненты и сбрасывает состояние.
     * @protected
     */
    beforeUnmount() {
        chatService.setOnSendGaveUp(null);

        this.chatsCoordinator?.destroy();
        this.chatsCoordinator = null;

        this.onboardingComponent?.unmount();
        this.onboardingComponent = null;
        this.cleanupMainContent();
        this.chatsView?.closeModal();

        this.creationController = null;
        this.createWindowController = null;
        this.detailsController = null;
        this.detailsFlowController = null;
        this.activeHeaderController = null;
        this.activeMessagesController = null;
        this.messageSearchController?.destroy();
        this.messageSearchController = null;
        this.presenceController?.destroy();
        this.presenceController = null;
        this.notificationPromptController = null;
        this.sidebarController?.destroy();
        this.sidebarController = null;
        this.realtimeController?.destroy();
        this.realtimeController = null;
        this.sessionController = null;

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
