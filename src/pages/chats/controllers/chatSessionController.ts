import type { MessageDto } from "../../../core/utils/wsClient";
import type { Chat, FrontendMessage, OutgoingMessageAttachment } from "../../../types/chat";
import { chatsUseCases, type ChatsUseCases } from "../model/chatsUseCases";
import type { ActiveChatVM, CurrentUserVM } from "../model/chatsViewModels";

interface ChatSessionControllerDeps {
    useCases?: ChatsUseCases;
}

export class ChatSessionController {
    private readonly useCases: ChatsUseCases;

    constructor(deps: ChatSessionControllerDeps = {}) {
        this.useCases = deps.useCases ?? chatsUseCases;
    }

    public loadCurrentUser(): Promise<CurrentUserVM> {
        return this.useCases.loadCurrentUser();
    }

    public hasAnyChats(currentUserId: number): Promise<boolean> {
        return this.useCases.hasAnyChats(currentUserId);
    }

    public loadActiveChat(chatId: string, currentUser: CurrentUserVM): Promise<ActiveChatVM | null> {
        return this.useCases.loadActiveChat(chatId, currentUser);
    }

    public loadMoreMessages(chat: Chat, currentUserId: number, beforeId: number | null): Promise<{
        messages: ActiveChatVM["messages"];
        hasMore: boolean;
        nextBeforeId: number | null;
    } | null> {
        return this.useCases.loadMoreMessages(chat, currentUserId, beforeId);
    }

    public searchMessages(
        chatId: string,
        query: string,
        currentUserId: number,
        beforeId: number | null,
    ) {
        return this.useCases.searchMessages(chatId, query, currentUserId, beforeId);
    }

    public resolveRealtimeMessage(dto: MessageDto, currentUserId: number): Promise<string | null> {
        return this.useCases.resolveRealtimeMessage(dto, currentUserId);
    }

    public mapRealtimeMessage(dto: MessageDto, currentUserId: number): FrontendMessage {
        return this.useCases.mapRealtimeMessage(dto, currentUserId);
    }

    public enrichMessageForChat(chat: Chat, message: FrontendMessage, currentUserId: number) {
        return this.useCases.enrichMessageForChat(chat, message, currentUserId);
    }

    public markMessageRead(chatId: string, messageId: string): boolean {
        return this.useCases.markMessageRead(chatId, messageId);
    }

    public flushPendingMessages(): Promise<void> {
        return this.useCases.flushPendingMessages();
    }

    public clearInFlightMessages(): void {
        this.useCases.clearInFlightMessages();
    }

    public deleteChat(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string }> {
        return this.useCases.deleteChat(chatId);
    }

    public leaveChat(chatId: string | number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.useCases.leaveChat(chatId);
    }

    public deleteMessage(chatId: string, messageId: string): boolean {
        return this.useCases.deleteMessage(chatId, messageId);
    }

    public sendMessage(
        chatId: string,
        text: string,
        senderId: number,
        attachments: OutgoingMessageAttachment[] = [],
    ) {
        return this.useCases.sendMessage(chatId, text, senderId, attachments);
    }

    public uploadMessageAttachment(file: File, type: "photo" | "video" | "file") {
        return this.useCases.uploadMessageAttachment(file, type);
    }

    public loadContacts() {
        return this.useCases.loadContacts();
    }

    public editMessage(chatId: string, messageId: string, text: string): boolean {
        return this.useCases.editMessage(chatId, messageId, text);
    }
}
