import type { ChannelDetail, ChannelMember, ChannelRole } from "../../../services/channelService";
import type { PendingMessage } from "../../../services/offlineMessageQueue";
import type { Chat, FrontendMessage, MessageStatus, User } from "../../../types/chat";
import type { FrontendContact } from "../../../types/contact";
import type { FrontendProfile } from "../../../types/profile";
import type { SearchChatHit, SearchContactHit, SearchMessageHit } from "../../../types/search";
import type { PresenceState } from "../../../core/utils/wsClient";

export type ChatType = Chat["type"];
export type CreateChatMode = ChatType;
export type ChatSearchType = "" | "group" | "channel";
export type ContactSearchScope = "contacts" | "local";

export type ChatRouteState =
    | { kind: "root" }
    | { kind: "chat"; chatId: string }
    | { kind: "create"; mode: CreateChatMode }
    | { kind: "invalid"; path: string };

export interface CurrentUserVM {
    id: number;
    login: string;
    displayName: string;
    avatarUrl?: string;
    profile: FrontendProfile;
}

export interface SidebarChatVM {
    id: string;
    type: ChatType;
    title: string;
    avatarUrl?: string;
    lastMessageText?: string;
    lastMessageAt?: Date;
    unreadCount: number;
    isActive: boolean;
    sourceChat: Chat;
}

export interface SidebarSearchVM {
    query: string;
    type: ChatSearchType;
    hits: SearchChatHit[];
    isLoading: boolean;
    nextBeforeId: number | null;
}

export interface MessageAuthorVM extends User {
    displayName: string;
}

export interface MessageVM extends FrontendMessage {
    sender: MessageAuthorVM;
    status: MessageStatus;
    tempId?: string;
    isPending: boolean;
    isHighlighted: boolean;
    chatAvatarLocked: boolean;
}

export interface PresenceVM extends PresenceState {
    userId: number;
    typingInActiveChat: boolean;
}

export interface ChatPermissionsVM {
    canWrite: boolean;
    canJoin: boolean;
    canLeave: boolean;
    canDelete: boolean;
    canEditDetails: boolean;
    canAddMembers: boolean;
    canRemoveMembers: boolean;
    canRestorePending: boolean;
}

export type DialogHeaderVM = {
    type: "dialog";
    title: string;
    avatarUrl?: string;
    interlocutor: User;
    presence: PresenceVM | null;
};

export type GroupHeaderVM = {
    type: "group";
    title: string;
    avatarUrl?: string;
    ownerId?: number;
    currentUserRole: "owner" | "member";
    membersCount: number;
};

export type ChannelHeaderVM = {
    type: "channel";
    title: string;
    avatarUrl?: string;
    subscribersCount: number;
    currentUserRole: ChannelRole;
};

export type ChatHeaderVM = DialogHeaderVM | GroupHeaderVM | ChannelHeaderVM;

export interface ActiveChatVM {
    chat: Chat;
    header: ChatHeaderVM;
    messages: MessageVM[];
    pendingMessages: PendingMessage[];
    permissions: ChatPermissionsVM;
    currentUser: CurrentUserVM;
    hasMoreHistory: boolean;
    nextBeforeId: number | null;
}

export interface GroupMemberVM {
    id: number;
    displayName: string;
    avatarUrl?: string;
    isOwner: boolean;
    sourceUser?: User;
}

export interface GroupDetailsVM {
    id: string;
    title: string;
    avatarUrl?: string;
    ownerId?: number;
    currentUserRole: "owner" | "member";
    members: GroupMemberVM[];
    canEdit: boolean;
    canLeave: boolean;
    canDelete: boolean;
    canAddMembers: boolean;
    canRemoveMembers: boolean;
}

export interface ChannelMemberVM extends ChannelMember {
    displayName: string;
}

export interface ChannelDetailsVM extends Omit<ChannelDetail, "members"> {
    members: ChannelMemberVM[];
    canEdit: boolean;
    canJoin: boolean;
    canLeave: boolean;
    canDelete: boolean;
    canRemoveMembers: boolean;
}

export interface ContactSearchVM {
    query: string;
    scope: ContactSearchScope;
    contacts: FrontendContact[];
    hits: SearchContactHit[];
    isLoading: boolean;
    nextBeforeId: number | null;
}

export interface MessageSearchVM {
    chatId: string;
    query: string;
    hits: SearchMessageHit[];
    isLoading: boolean;
    nextBeforeId: number | null;
}

export interface NotificationPromptVM {
    visible: boolean;
    canRequest: boolean;
    dismissedAt?: number;
    cooldownUntil?: Date;
}
