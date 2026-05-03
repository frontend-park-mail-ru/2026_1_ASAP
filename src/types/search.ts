export interface SearchMessageHit {
    messageId: string;
    chatId: string;
    senderId: number;
    textPreview: string;
    createdAt: Date;
}

export interface SearchMessagesResult {
    items: SearchMessageHit[];
    nextBeforeId: number | null;
}

export interface SearchChatHit {
    chatId: string;
    type: 'dialog' | 'group' | 'channel';
    title: string;
    avatarUrl?: string;
    lastMessagePreview?: string;
    lastMessageAt?: Date;
    unreadCount: number;
}

export interface SearchChatsResult {
    items: SearchChatHit[];
    nextBeforeId: number | null;
}

export interface SearchContactHit {
    userId: number;
    displayName: string;
    login?: string;
    avatarUrl?: string;
    isOnline: boolean;
    lastSeenAt?: Date;
}

export interface SearchContactsResult {
    items: SearchContactHit[];
    nextBeforeId: number | null;
}