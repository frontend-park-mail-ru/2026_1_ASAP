import type { UnifiedSearchResult } from "../../../types/search";
import type { Chat, FrontendMessage } from "../../../types/chat";
import type {
    ChatDeletedDto,
    ChatInformationDto,
    ChatUpdatedAvatarDto,
    ChatUpdatedDescriptionDto,
    ChatUpdatedMembersDto,
    ChatUpdatedTitleDto,
    MessageDto,
} from "../../../core/utils/wsClient";
import { ChatsUseCases, chatsUseCases } from "../model/chatsUseCases";
import type { SearchTab } from "../../../components/composite/searchTabs/searchTabs";

interface ChatSidebarControllerDeps {
    useCases?: ChatsUseCases;
    getActiveChatId: () => string | null;
    onChatsLoaded: (chats: Chat[]) => void;
    onChatAdded: (chat: Chat) => void;
    onChatUpdated: (chat: Chat) => void;
    onChatRemoved: (chatId: string) => void;
    onChatMovedToTop: (chatId: string) => void;
    onActiveChatRemoved: (chatId: string) => void;
    onSearchResults: (result: UnifiedSearchResult) => void;
    onRestoreChatList: () => void;
    onSearchActiveChange?: (isActive: boolean) => void;
    debounceMs?: number;
}

export class ChatSidebarController {
    private readonly useCases: ChatsUseCases;
    private readonly debounceMs: number;
    private searchDebounce: ReturnType<typeof setTimeout> | null = null;
    private searchRequestId = 0;
    private loadRequestId = 0;
    private searchTab: SearchTab = 'dialog';
    private currentQuery = "";
    private chats: Chat[] = [];
    private currentUserId: number | null = null;
    private realtimeVersion = 0;
    private realtimeUnsubscribers: Array<() => void> = [];

    constructor(private readonly deps: ChatSidebarControllerDeps) {
        this.useCases = deps.useCases ?? chatsUseCases;
        this.debounceMs = deps.debounceMs ?? 300;
    }

    public getChats(): Chat[] {
        return this.chats;
    }

    public async loadSidebarChats(currentUserId: number, activeChatId: string | null): Promise<void> {
        this.loadRequestId += 1;
        const requestId = this.loadRequestId;
        const realtimeVersion = this.realtimeVersion;
        const viewModels = await this.useCases.loadSidebarChats(currentUserId, activeChatId);

        if (requestId !== this.loadRequestId) return;
        if (realtimeVersion !== this.realtimeVersion) return;

        this.currentUserId = currentUserId;
        this.chats = viewModels.map(vm => vm.sourceChat);
        this.deps.onChatsLoaded(this.chats);
    }

    public startRealtime(currentUserId: number): void {
        this.stopRealtime();
        this.currentUserId = currentUserId;

        this.realtimeUnsubscribers = [
            this.useCases.subscribeRealtime<ChatInformationDto>('chat.New', this.handleChatNew),
            this.useCases.subscribeRealtime<ChatDeletedDto>('chat.Deleted', this.handleChatDeleted),
            this.useCases.subscribeRealtime<ChatUpdatedAvatarDto>('chat.Updated.Avatar', this.handleChatAvatarUpdated),
            this.useCases.subscribeRealtime<ChatUpdatedTitleDto>('chat.Updated.Title', this.handleChatTitleUpdated),
            this.useCases.subscribeRealtime<ChatUpdatedDescriptionDto>('chat.Updated.Description', this.handleChatDescriptionUpdated),
            this.useCases.subscribeRealtime<ChatUpdatedMembersDto>('chat.Updated.Members', this.handleChatMembersUpdated),
            this.useCases.subscribeRealtime<MessageDto>('message.New', this.handleMessageNew),
        ];
    }

    public handleSearchInput(query: string): void {
        this.clearSearchDebounce();
        this.currentQuery = query;

        if (!query.trim()) {
            this.cancelPendingSearch();
            this.deps.onSearchActiveChange?.(false);
            this.deps.onRestoreChatList();
            return;
        }

        this.deps.onSearchActiveChange?.(true);
        this.searchDebounce = setTimeout(() => {
            this.runUnifiedSearch(query);
        }, this.debounceMs);
    }

    public setSearchTab(tab: SearchTab): void {
        if (tab === this.searchTab) return;
        this.searchTab = tab;

        if (this.currentQuery.trim()) {
            this.clearSearchDebounce();
            this.runUnifiedSearch(this.currentQuery);
        }
    }

    public getSearchTab(): SearchTab {
        return this.searchTab;
    }

    public cancelPendingSearch(): void {
        this.clearSearchDebounce();
        this.searchRequestId += 1;
    }

    public destroy(): void {
        this.cancelPendingSearch();
        this.stopRealtime();
    }

    private async runUnifiedSearch(query: string): Promise<void> {
        this.searchRequestId += 1;
        const requestId = this.searchRequestId;
        const result = await this.useCases.searchUnified(query, this.searchTab);

        if (requestId !== this.searchRequestId) return;

        this.deps.onSearchResults(result);
    }

    private clearSearchDebounce(): void {
        if (this.searchDebounce === null) return;

        clearTimeout(this.searchDebounce);
        this.searchDebounce = null;
    }

    private stopRealtime(): void {
        this.realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.realtimeUnsubscribers = [];
    }

    private readonly handleChatNew = async (payload: ChatInformationDto): Promise<void> => {
        if (this.currentUserId === null) return;
        if (this.chats.some(chat => String(chat.id) === String(payload.id))) return;

        const chat = await this.useCases.mapRealtimeSidebarChat(payload, this.currentUserId);
        if (this.chats.some(item => String(item.id) === String(chat.id))) return;

        this.chats = [chat, ...this.chats];
        this.markRealtimeMutation();
        this.deps.onChatAdded(chat);
    };

    private readonly handleChatDeleted = (payload: ChatDeletedDto): void => {
        this.removeChat(String(payload.id));
    };

    private readonly handleMessageNew = (payload: MessageDto): void => {
        if (this.currentUserId === null) return;

        const targetId = String(payload.chat_id);
        const targetChat = this.chats.find(chat => String(chat.id) === targetId);
        if (!targetChat) return;

        const message = this.useCases.mapRealtimeSidebarMessage(payload, this.currentUserId);

        const patch: Partial<Chat> = { lastMessage: message } as Partial<Chat>;
        // Инкрементируем непрочитанные, если сообщение чужое и чат сейчас не открыт.
        const isActive = String(this.deps.getActiveChatId() ?? '') === targetId;
        if (!isActive && !message.isOwn) {
            (patch as { unreadCount: number }).unreadCount = (targetChat.unreadCount ?? 0) + 1;
        }

        this.updateChat(targetId, patch);
        this.moveChatToTop(targetId);
        this.enrichRealtimeMessage(targetId, message);
    };

    /**
     * Сбрасывает счётчик непрочитанных для чата (вызывается при открытии чата).
     * lastReadMessageId не трогаем — он обновится по событию message.Read.
     */
    public resetUnread(chatId: string): void {
        const target = this.chats.find(chat => String(chat.id) === String(chatId));
        if (!target || !target.unreadCount) return;
        this.updateChat(String(chatId), { unreadCount: 0 } as Partial<Chat>);
    }

    /**
     * Применяет message.Read со своим reader_user_id: обнуляем unread и
     * обновляем lastReadMessageId, чтобы следующий открытие чата корректно
     * нашло «новые» сообщения.
     */
    public applyOwnRead(chatId: string, lastReadMessageId: number): void {
        const target = this.chats.find(chat => String(chat.id) === String(chatId));
        if (!target) return;
        const patch: Partial<Chat> = { unreadCount: 0, lastReadMessageId } as Partial<Chat>;
        this.updateChat(String(chatId), patch);
    }

    private readonly handleChatAvatarUpdated = (payload: ChatUpdatedAvatarDto): void => {
        this.updateChat(String(payload.chat_id), { avatarUrl: payload.avatar_url } as Partial<Chat>);
    };

    private readonly handleChatTitleUpdated = (payload: ChatUpdatedTitleDto): void => {
        this.updateChat(String(payload.chat_id), { title: payload.title } as Partial<Chat>);
    };

    private readonly handleChatDescriptionUpdated = (payload: ChatUpdatedDescriptionDto): void => {
        this.updateChat(String(payload.chat_id), { description: payload.description } as Partial<Chat>);
    };

    private readonly handleChatMembersUpdated = (payload: ChatUpdatedMembersDto): void => {
        if (this.currentUserId === null) return;
        if (payload.type !== 'deleted') return;
        if (!payload.updated_members_id.includes(this.currentUserId)) return;

        this.removeChat(String(payload.chat_id));
    };

    private updateChat(chatId: string, patch: Partial<Chat>): void {
        let updatedChat: Chat | null = null;

        this.chats = this.chats.map(chat => {
            if (String(chat.id) !== String(chatId)) return chat;

            updatedChat = { ...chat, ...patch } as Chat;
            return updatedChat;
        });

        if (updatedChat) {
            this.markRealtimeMutation();
            this.deps.onChatUpdated(updatedChat);
        }
    }

    private moveChatToTop(chatId: string): void {
        const index = this.chats.findIndex(chat => String(chat.id) === String(chatId));
        if (index <= 0) return;

        const [chat] = this.chats.splice(index, 1);
        this.chats.unshift(chat);
        this.markRealtimeMutation();
        this.deps.onChatMovedToTop(chatId);
    }

    private removeChat(chatId: string): void {
        const existed = this.chats.some(chat => String(chat.id) === String(chatId));
        if (!existed) return;

        this.chats = this.chats.filter(chat => String(chat.id) !== String(chatId));
        this.markRealtimeMutation();
        this.deps.onChatRemoved(chatId);

        if (this.deps.getActiveChatId() === chatId) {
            this.deps.onActiveChatRemoved(chatId);
        }
    }

    private async enrichRealtimeMessage(chatId: string, message: FrontendMessage): Promise<void> {
        if (this.currentUserId === null) return;

        const chat = this.chats.find(item => String(item.id) === String(chatId));
        if (!chat) return;

        const enrichedMessage = await this.useCases.enrichRealtimeSidebarMessage(chat, message, this.currentUserId);
        if (enrichedMessage === message) return;

        const currentChat = this.chats.find(item => String(item.id) === String(chatId));
        if (!currentChat || currentChat.lastMessage?.id !== message.id) return;

        this.updateChat(chatId, { lastMessage: enrichedMessage } as Partial<Chat>);
    }

    private markRealtimeMutation(): void {
        this.realtimeVersion += 1;
    }
}
