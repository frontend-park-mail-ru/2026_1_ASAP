import type { ChannelRole, CreateChannelInput, UpdateChannelInput } from "../../../services/channelService";
import type { ChatInformationDto, MessageDto, PresenceState, WsErrorDto } from "../../../core/utils/wsClient";
import type { ChannelChat, Chat, DialogChat, FrontendMessage, GroupChat, OutgoingMessageAttachment, User } from "../../../types/chat";
import type { FrontendProfile } from "../../../types/profile";
import type { SearchMessageHit, SearchMessagesResult } from "../../../types/search";
import { ChatsDataFacade, chatsDataFacade } from "./chatsDataFacade";
import type {
    ActiveChatVM,
    ChannelDetailsVM,
    ChannelHeaderVM,
    ChatHeaderVM,
    ChatPermissionsVM,
    ChatSearchType,
    ContactSearchScope,
    CurrentUserVM,
    DialogHeaderVM,
    GroupDetailsVM,
    GroupHeaderVM,
    GroupMemberVM,
    MessageVM,
    NotificationPromptVM,
    PresenceVM,
    SidebarChatVM,
} from "./chatsViewModels";

const NOTIFICATION_PROMPT_DISMISSED_AT_KEY = "notification_prompt_dismissed_at";
const NOTIFICATION_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function getProfileDisplayName(profile: FrontendProfile): string {
    return [profile.mainInfo.firstName, profile.mainInfo.lastName].filter(Boolean).join(" ")
        || profile.additionalInfo.login;
}

function getUserDisplayName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;
}

function hasSenderDisplayName(message?: FrontendMessage): boolean {
    if (!message) return false;
    if (message.isOwn) return true;

    const { firstName, lastName, login } = message.sender;
    return Boolean(firstName || lastName || (login && login !== "unknown" && !login.startsWith("user_")));
}

function getMessagePreview(message?: FrontendMessage): string | undefined {
    if (!message) return undefined;
    if (message.text) return message.text;

    const attachment = message.attachments?.[0];
    if (!attachment) return undefined;

    switch (attachment.type) {
        case "photo":
            return "Фото";
        case "video":
            return "Видео";
        case "file":
            return attachment.fileName || "Файл";
        case "contact":
            return [attachment.contactFirstName, attachment.contactLastName].filter(Boolean).join(" ") || "Контакт";
        default:
            return undefined;
    }
}

function toMessageVM(message: FrontendMessage, chat: Chat): MessageVM {
    const sender = {
        ...message.sender,
        displayName: getUserDisplayName(message.sender),
    };

    return {
        ...message,
        sender,
        status: message.status || "sent",
        isPending: message.status === "sending",
        isHighlighted: false,
        chatAvatarLocked: chat.type === "channel",
    };
}

function toPresenceVM(userId: number, chatId: string, presence: ReturnType<ChatsDataFacade["getPresence"]>): PresenceVM | null {
    if (!presence) return null;

    return {
        ...presence,
        userId,
        typingInActiveChat: String(presence.typingInChat ?? "") === chatId,
    };
}

function groupRole(chat: GroupChat, currentUserId: number): "owner" | "member" {
    return chat.owner_id === currentUserId || chat.owner?.id === currentUserId ? "owner" : "member";
}

function channelRole(chat: ChannelChat, role?: ChannelRole): ChannelRole {
    return role || chat.currentUserRole || "guest";
}

function toPermissions(chat: Chat, currentUserId: number, role?: ChannelRole): ChatPermissionsVM {
    if (chat.type === "channel") {
        const currentRole = channelRole(chat, role);
        return {
            canWrite: currentRole === "owner",
            canJoin: currentRole === "guest",
            canLeave: currentRole === "participant",
            canDelete: currentRole === "owner",
            canEditDetails: currentRole === "owner",
            canAddMembers: false,
            canRemoveMembers: currentRole === "owner",
            canRestorePending: currentRole !== "guest",
        };
    }

    if (chat.type === "group") {
        const isOwner = groupRole(chat, currentUserId) === "owner";
        return {
            canWrite: true,
            canJoin: false,
            canLeave: !isOwner,
            canDelete: isOwner,
            canEditDetails: isOwner,
            canAddMembers: true,
            canRemoveMembers: isOwner,
            canRestorePending: true,
        };
    }

    return {
        canWrite: true,
        canJoin: false,
        canLeave: false,
        canDelete: true,
        canEditDetails: false,
        canAddMembers: false,
        canRemoveMembers: false,
        canRestorePending: true,
    };
}

function toSidebarChatVM(chat: Chat, activeChatId: string | null): SidebarChatVM {
    return {
        id: chat.id,
        type: chat.type,
        title: chat.title,
        avatarUrl: chat.avatarUrl,
        lastMessageText: getMessagePreview(chat.lastMessage),
        lastMessageAt: chat.lastMessage?.timestamp,
        unreadCount: chat.unreadCount ?? 0,
        isActive: chat.id === activeChatId,
        sourceChat: chat,
    };
}

export class ChatsUseCases {
    constructor(private readonly data: ChatsDataFacade = chatsDataFacade) {}

    public async loadCurrentUser(): Promise<CurrentUserVM> {
        const profile = await this.data.getCurrentProfile();
        return {
            id: profile.additionalInfo.id,
            login: profile.additionalInfo.login,
            displayName: getProfileDisplayName(profile),
            avatarUrl: profile.mainInfo.avatarUrl,
            profile,
        };
    }

    public async loadSidebarChats(currentUserId: number, activeChatId: string | null = null): Promise<SidebarChatVM[]> {
        const chats = await this.data.getChats(currentUserId);
        const enrichedChats = await Promise.all(
            chats.map((chat) => this.enrichSidebarChat(chat, currentUserId)),
        );

        return enrichedChats.map((chat) => toSidebarChatVM(chat, activeChatId));
    }

    public async hasAnyChats(currentUserId: number): Promise<boolean> {
        const chats = await this.data.getChats(currentUserId);
        return chats.length > 0;
    }

    public async searchSidebarChats(
        query: string,
        type: ChatSearchType = "",
        beforeId: number | null = null,
    ) {
        return this.data.searchChats(query, type, beforeId);
    }

    public async searchContacts(query: string, scope: ContactSearchScope) {
        return this.data.searchContacts(query, scope);
    }

    public async loadContacts() {
        return this.data.getContacts();
    }

    public rejectPendingMessageFromError(error: WsErrorDto, activeChatId?: string | null): Promise<string | null> {
        return this.data.rejectPendingMessageFromError(error, activeChatId);
    }

    public async createDialogChat(currentUserId: number, contactId: number, contactLogin?: string) {
        if (currentUserId === contactId) {
            return { success: false, status: 400 };
        }

        const result = await this.data.createChat([contactId], "dialog");
        const createdChatId = result.body?.id ?? result.body?.chat_id;
        if (result.success && createdChatId) {
            return { success: true, status: result.status, chatId: String(createdChatId) };
        }

        if (result.status === 409) {
            const existingChatId = await this.data.findExistingDialogChatId(contactId, contactLogin);
            if (existingChatId) {
                return { success: true, status: result.status, chatId: existingChatId };
            }
        }

        return { success: false, status: result.status };
    }

    public async createGroupChat(currentUserId: number, userIds: number[], groupName: string) {
        const memberIds = [currentUserId, ...userIds];
        const result = await this.data.createChat(memberIds, "group", groupName);
        const createdChatId = result.body?.id ?? result.body?.chat_id;

        if (result.success && createdChatId) {
            return { success: true, status: result.status, chatId: String(createdChatId) };
        }

        return { success: false, status: result.status };
    }

    public createChannel(input: CreateChannelInput, currentUserId: number) {
        return this.data.createChannel(input, currentUserId);
    }

    public async mapRealtimeSidebarChat(dto: ChatInformationDto, currentUserId: number): Promise<Chat> {
        const chat = this.data.mapChatDtoToChat(dto, currentUserId);
        return this.enrichSidebarChat(chat, currentUserId);
    }

    public mapRealtimeSidebarMessage(dto: MessageDto, currentUserId: number): FrontendMessage {
        const message = this.data.convertWsMessageDto(dto, currentUserId);
        // Для sidebar preview у стикеровых сообщений подменяем пустой текст на «Стикер».
        if (message.sticker && !message.text) {
            message.text = message.sticker.emoji
                ? `${message.sticker.emoji} Стикер`
                : 'Стикер';
        }
        return message;
    }

    public async enrichRealtimeSidebarMessage(
        chat: Chat,
        message: FrontendMessage,
        currentUserId: number,
    ): Promise<FrontendMessage> {
        if (chat.type !== "group") return message;
        return this.enrichMessageSender(message, currentUserId);
    }

    public subscribeRealtime<T = unknown>(eventType: string, handler: (payload: T) => void): () => void {
        return this.data.subscribeWs<T>(eventType, handler);
    }

    public async loadActiveChat(chatId: string, currentUser: CurrentUserVM): Promise<ActiveChatVM | null> {
        const chat = await this.data.getChatDetail(chatId);
        if (!chat) return null;

        let resolvedChat = chat.type === "dialog"
            ? await this.hydrateDialogChat(chat, currentUser.id)
            : chat;

        const channelDetail = resolvedChat.type === "channel"
            ? await this.data.getChannel(chatId, currentUser.id)
            : null;

        if (resolvedChat.type === "channel" && !channelDetail) {
            return null;
        }

        if (resolvedChat.type === "channel" && channelDetail) {
            resolvedChat = {
                ...resolvedChat,
                currentUserRole: channelDetail.currentUserRole,
                subscribersCount: channelDetail.subscribersCount,
            };
        }

        const [history, pendingMessages, groupMemberIds] = await Promise.all([
            this.data.getMessages(chatId, currentUser.id),
            this.data.getPendingMessages(chatId).catch((err) => {
                console.warn('chatsUseCases: getPendingMessages failed', err);
                return [];
            }),
            resolvedChat.type === "group" ? this.data.getChatMembers(chatId) : Promise.resolve(null),
        ]);

        const channelCurrentRole = channelDetail?.currentUserRole;
        const header = this.toHeaderVM(
            resolvedChat,
            currentUser.id,
            channelCurrentRole,
            groupMemberIds?.length,
        );

        const rawMessages = history?.messages ?? [];
        const messages = await Promise.all(
            rawMessages.map((message) => this.enrichMessageForChat(resolvedChat, message, currentUser.id)),
        );

        return {
            chat: resolvedChat,
            header,
            messages: messages.map((message) => toMessageVM(message, resolvedChat)),
            pendingMessages,
            permissions: toPermissions(resolvedChat, currentUser.id, channelCurrentRole),
            currentUser,
            hasMoreHistory: history?.hasMore ?? false,
            nextBeforeId: history?.nextBeforeId ?? null,
        };
    }

    public async loadMoreMessages(
        chat: Chat,
        currentUserId: number,
        beforeId: number | null,
    ): Promise<{ messages: MessageVM[]; hasMore: boolean; nextBeforeId: number | null } | null> {
        const history = await this.data.getMessages(chat.id, currentUserId, beforeId);
        if (!history) return null;

        const messages = await Promise.all(
            history.messages.map((message) => this.enrichMessageForChat(chat, message, currentUserId)),
        );

        return {
            messages: messages.map((message) => toMessageVM(message, chat)),
            hasMore: history.hasMore,
            nextBeforeId: history.nextBeforeId,
        };
    }

    public sendMessage(
        chatId: string,
        text: string,
        senderId: number,
        attachments: OutgoingMessageAttachment[] = [],
    ) {
        return this.data.sendMessage(chatId, text, senderId, attachments);
    }

    public uploadMessageAttachment(file: File, type: "photo" | "video" | "file") {
        return this.data.uploadMessageAttachment(file, type);
    }

    public editMessage(chatId: string, messageId: string, text: string): boolean {
        return this.data.editMessage(chatId, messageId, text);
    }

    public deleteMessage(chatId: string, messageId: string): boolean {
        return this.data.deleteMessage(chatId, messageId);
    }

    public markMessageRead(chatId: string, messageId: string): boolean {
        return this.data.markMessageRead(chatId, messageId);
    }

    public resolveRealtimeMessage(dto: MessageDto, currentUserId: number): Promise<string | null> {
        return this.data.resolveServerMessage(dto, currentUserId);
    }

    public mapRealtimeMessage(dto: MessageDto, currentUserId: number): FrontendMessage {
        return this.data.convertWsMessageDto(dto, currentUserId);
    }

    public enrichMessageForChat(
        chat: Chat,
        message: FrontendMessage,
        currentUserId: number,
    ): Promise<FrontendMessage> {
        if (chat.type === "channel") {
            return Promise.resolve(message);
        }

        return this.enrichMessageSender(message, currentUserId);
    }

    public emitTyping(chatId: string): void {
        this.data.emitTyping(chatId);
    }

    public stopTyping(chatId: string): void {
        this.data.stopTyping(chatId);
    }

    public subscribePresence(userId: number, handler: (state: PresenceState) => void): () => void {
        return this.data.subscribePresence(userId, handler);
    }

    public getPresence(userId: number): PresenceState | null {
        return this.data.getPresence(userId);
    }

    public requestUserProfile(userId: number): Promise<User | null> {
        return this.data.getUserProfile(userId);
    }

    public flushPendingMessages(): Promise<void> {
        return this.data.flushPendingMessages();
    }

    public clearInFlightMessages(): void {
        this.data.clearInFlightMessages();
    }

    public async searchMessages(
        chatId: string,
        query: string,
        currentUserId: number,
        beforeId: number | null = null,
    ): Promise<SearchMessagesResult | null> {
        const result = await this.data.searchMessages(chatId, query, beforeId);
        if (!result) return null;

        return {
            ...result,
            items: await Promise.all(
                result.items.map((hit) => this.enrichSearchMessageHit(hit, currentUserId)),
            ),
        };
    }

    public async loadGroupDetails(chat: GroupChat, currentUserId: number): Promise<GroupDetailsVM> {
        const memberIds = await this.data.getChatMembers(chat.id);
        const members = await Promise.all(
            memberIds.map(async (id): Promise<GroupMemberVM> => {
                const profile = await this.data.getUserProfile(id);
                return {
                    id,
                    displayName: profile ? getUserDisplayName(profile) : `User#${id}`,
                    avatarUrl: profile?.avatarUrl,
                    isOwner: chat.owner_id === id || chat.owner?.id === id,
                    sourceUser: profile ?? undefined,
                };
            }),
        );
        const currentUserRole = groupRole(chat, currentUserId);
        const permissions = toPermissions(chat, currentUserId);

        return {
            id: chat.id,
            title: chat.title,
            avatarUrl: chat.avatarUrl,
            ownerId: chat.owner_id || chat.owner?.id,
            currentUserRole,
            members,
            canEdit: permissions.canEditDetails,
            canLeave: permissions.canLeave,
            canDelete: permissions.canDelete,
            canAddMembers: permissions.canAddMembers,
            canRemoveMembers: permissions.canRemoveMembers,
        };
    }

    public async loadChannelDetails(chat: ChannelChat, currentUserId: number): Promise<ChannelDetailsVM | null> {
        const detail = await this.data.getChannel(chat.id, currentUserId);
        if (!detail) return null;

        return {
            ...detail,
            members: detail.members.map((member) => ({
                ...member,
                displayName: member.name,
            })),
            canEdit: detail.currentUserRole === "owner",
            canJoin: detail.currentUserRole === "guest",
            canLeave: detail.currentUserRole === "participant",
            canDelete: detail.currentUserRole === "owner",
            canRemoveMembers: detail.currentUserRole === "owner",
        };
    }

    public updateGroup(
        chatId: string,
        title?: string,
        avatar?: File,
    ): Promise<{ success: boolean; errorCode?: string }> {
        return this.updateChatMedia(chatId, "group", title, avatar);
    }

    public deleteChat(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string }> {
        return this.data.deleteChat(chatId);
    }

    public leaveChat(chatId: string | number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.data.leaveChat(chatId);
    }

    public leaveGroup(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.data.leaveGroup(chatId);
    }

    public removeGroupMember(chatId: string, userId: number): Promise<{ success: boolean; status: number }> {
        return this.data.removeMember(chatId, userId);
    }

    public async getProfileLogin(userId: number): Promise<string> {
        const profile = await this.data.getProfileInfo(userId);
        return profile?.additionalInfo?.login || String(userId);
    }

    public getUserIdByLogin(login: string): Promise<{ id: number | null; status: number }> {
        return this.data.getIdByLogin(login);
    }

    public addMembersToGroup(chatId: string, userIds: number[]): Promise<{ success: boolean; status: number; errorCode?: string }> {
        return this.data.addMembersToChat(chatId, userIds);
    }

    public updateChannel(
        channelId: string,
        input: UpdateChannelInput,
        currentUserId: number,
    ): Promise<{ success: boolean; errorCode?: string }> {
        return this.data.updateChannel(channelId, input, currentUserId);
    }

    public joinChannel(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.data.joinChannel(chatId);
    }

    public leaveChannel(chatId: string): Promise<{ success: boolean }> {
        return this.data.leaveChannel(chatId);
    }

    public deleteChannel(chatId: string): Promise<{ success: boolean; errorCode?: string }> {
        return this.data.deleteChannel(chatId);
    }

    public removeChannelMember(chatId: string, userId: number): Promise<{ success: boolean }> {
        return this.data.removeChannelMember(chatId, userId);
    }

    private async updateChatMedia(
        chatId: string,
        operation: "group" | "channel",
        title?: string,
        avatar?: File,
    ): Promise<{ success: boolean; errorCode?: string }> {
        const results: boolean[] = [];

        if (title) {
            results.push(await this.data.updateChatTitle(chatId, title));
        }
        if (avatar) {
            results.push(await this.data.updateChatAvatar(chatId, avatar));
        }

        const success = results.length === 0 || results.every(Boolean);
        return success ? { success: true } : { success: false, errorCode: operation === "group" ? "UPDATE_GROUP_FAILED" : "UPDATE_CHANNEL_FAILED" };
    }

    public getNotificationPromptState(now: number = Date.now()): NotificationPromptVM {
        const canRequest = this.data.canRequestNotifications();
        if (!canRequest) {
            return { visible: false, canRequest: false };
        }

        const dismissedAt = this.getPromptDismissedAt();
        const cooldownUntil = dismissedAt ? new Date(dismissedAt + NOTIFICATION_PROMPT_COOLDOWN_MS) : undefined;
        const visible = dismissedAt === 0 || now - dismissedAt >= NOTIFICATION_PROMPT_COOLDOWN_MS;

        return { visible, canRequest, dismissedAt: dismissedAt || undefined, cooldownUntil };
    }

    public dismissNotificationPrompt(now: number = Date.now()): void {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_AT_KEY, String(now));
    }

    public requestNotificationPermission(): Promise<boolean> {
        return this.data.requestNotificationPermission();
    }

    private getPromptDismissedAt(): number {
        if (typeof localStorage === "undefined") return 0;
        return Number(localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_AT_KEY) || 0);
    }

    private async hydrateDialogChat(chat: DialogChat, currentUserId: number): Promise<DialogChat> {
        const memberIds = await this.data.getChatMembers(chat.id);
        const interlocutorId = memberIds.find((id) => id !== currentUserId)
            || memberIds[0]
            || chat.interlocutor.id;

        if (!interlocutorId) return chat;

        const user = await this.data.getUserProfile(interlocutorId);
        if (user) {
            return {
                ...chat,
                avatarUrl: chat.avatarUrl || user.avatarUrl,
                interlocutor: {
                    ...chat.interlocutor,
                    ...user,
                    id: interlocutorId,
                },
            };
        }

        const profile = await this.data.getProfileInfo(interlocutorId);
        return {
            ...chat,
            avatarUrl: chat.avatarUrl || profile.mainInfo.avatarUrl,
            interlocutor: {
                ...chat.interlocutor,
                id: interlocutorId,
                login: profile.additionalInfo.login,
                avatarUrl: profile.mainInfo.avatarUrl || chat.interlocutor.avatarUrl,
                firstName: profile.mainInfo.firstName,
                lastName: profile.mainInfo.lastName,
            },
        };
    }

    private async enrichSidebarChat(chat: Chat, currentUserId: number): Promise<Chat> {
        if (chat.type !== "group") return chat;
        if (!chat.lastMessage) return chat;

        const lastMessage = await this.enrichMessageSender(chat.lastMessage, currentUserId);
        if (lastMessage === chat.lastMessage) return chat;

        return {
            ...chat,
            lastMessage,
        };
    }

    private async enrichMessageSender(message: FrontendMessage, currentUserId: number): Promise<FrontendMessage> {
        if (message.isOwn) return message;
        if (hasSenderDisplayName(message)) return message;

        const senderId = message.sender.id;
        if (!senderId || senderId === currentUserId) return message;

        const profile = await this.data.getUserProfile(senderId);
        if (!profile) return message;

        return {
            ...message,
            sender: {
                ...message.sender,
                ...profile,
            },
        };
    }

    private async enrichSearchMessageHit(hit: SearchMessageHit, currentUserId: number): Promise<SearchMessageHit> {
        if (hit.senderId === currentUserId) {
            return {
                ...hit,
                authorName: "Вы",
            };
        }

        const profile = await this.data.getUserProfile(hit.senderId);
        if (!profile) return hit;

        return {
            ...hit,
            authorName: getUserDisplayName(profile),
            authorAvatarUrl: profile.avatarUrl,
        };
    }

    private toHeaderVM(
        chat: Chat,
        currentUserId: number,
        channelCurrentRole?: ChannelRole,
        groupMembersCount?: number,
    ): ChatHeaderVM {
        if (chat.type === "dialog") {
            const presence = toPresenceVM(chat.interlocutor.id, chat.id, this.data.getPresence(chat.interlocutor.id));
            return {
                type: "dialog",
                title: chat.title,
                avatarUrl: chat.avatarUrl,
                interlocutor: chat.interlocutor,
                presence,
            } satisfies DialogHeaderVM;
        }

        if (chat.type === "group") {
            return {
                type: "group",
                title: chat.title,
                avatarUrl: chat.avatarUrl,
                ownerId: chat.owner_id || chat.owner?.id,
                currentUserRole: groupRole(chat, currentUserId),
                membersCount: groupMembersCount ?? chat.members.length,
            } satisfies GroupHeaderVM;
        }

        return {
            type: "channel",
            title: chat.title,
            avatarUrl: chat.avatarUrl,
            subscribersCount: chat.subscribersCount,
            currentUserRole: channelRole(chat, channelCurrentRole),
        } satisfies ChannelHeaderVM;
    }
}

export const chatsUseCases = new ChatsUseCases();
