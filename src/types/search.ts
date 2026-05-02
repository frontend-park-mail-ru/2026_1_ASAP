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
