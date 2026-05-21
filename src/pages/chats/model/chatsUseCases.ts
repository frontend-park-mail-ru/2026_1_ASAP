import type { ChannelRole } from "../../../services/channelService";
import type { ChannelChat, Chat, FrontendMessage, GroupChat, User } from "../../../types/chat";
import type { FrontendProfile } from "../../../types/profile";
import { ChatsDataFacade, chatsDataFacade } from "./chatsDataFacade";
import type {
    ActiveChatVM,
    ChannelDetailsVM,
    ChannelHeaderVM,
    ChatHeaderVM,
    ChatPermissionsVM,
    ChatSearchType,
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
            canWrite: currentRole !== "guest",
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
        lastMessageText: chat.lastMessage?.text,
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
        return chats.map((chat) => toSidebarChatVM(chat, activeChatId));
    }

    public async searchSidebarChats(
        query: string,
        type: ChatSearchType = "",
        beforeId: number | null = null,
    ) {
        return this.data.searchChats(query, type, beforeId);
    }

    public async loadActiveChat(chatId: string, currentUser: CurrentUserVM): Promise<ActiveChatVM | null> {
        const chat = await this.data.getChatDetail(chatId);
        if (!chat) return null;

        const channelDetail = chat.type === "channel"
            ? await this.data.getChannel(chatId, currentUser.id)
            : null;

        const [history, pendingMessages] = await Promise.all([
            this.data.getMessages(chatId, currentUser.id),
            this.data.getPendingMessages(chatId),
        ]);

        const channelCurrentRole = channelDetail?.currentUserRole;
        const header = this.toHeaderVM(chat, currentUser.id, channelCurrentRole);

        return {
            chat,
            header,
            messages: (history?.messages ?? []).map((message) => toMessageVM(message, chat)),
            pendingMessages,
            permissions: toPermissions(chat, currentUser.id, channelCurrentRole),
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

        return {
            messages: history.messages.map((message) => toMessageVM(message, chat)),
            hasMore: history.hasMore,
            nextBeforeId: history.nextBeforeId,
        };
    }

    public async searchMessages(chatId: string, query: string, beforeId: number | null = null) {
        return this.data.searchMessages(chatId, query, beforeId);
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

    private toHeaderVM(chat: Chat, currentUserId: number, channelCurrentRole?: ChannelRole): ChatHeaderVM {
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
                membersCount: chat.members.length,
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
