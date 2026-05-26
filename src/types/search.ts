export interface SearchMessageHit {
    messageId: string;
    chatId: string;
    senderId: number;
    authorName?: string;
    authorAvatarUrl?: string;
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

/**
 * Результат единого поискового запроса. Для табов dialog/group/channel —
 * заполнены `chats`. Для таба contact — `contacts.local` (мои контакты) и
 * `contacts.global` (все остальные, без дубликатов с local).
 */
export interface UnifiedSearchResult {
    tab: 'dialog' | 'group' | 'channel' | 'contact';
    chats: SearchChatHit[];
    contacts?: {
        local: SearchContactHit[];
        global: SearchContactHit[];
    };
}
