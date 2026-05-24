import { wsClient } from "../../../core/utils/wsClient";
import type { ChatInformationDto, MessageDto, PresenceState, WsErrorDto } from "../../../core/utils/wsClient";
import { channelService } from "../../../services/channelService";
import type { ChannelDetail, CreateChannelInput, UpdateChannelInput } from "../../../services/channelService";
import { chatService } from "../../../services/chatService";
import { contactService } from "../../../services/contactService";
import { notificationService } from "../../../services/notificationService";
import { offlineQueue } from "../../../services/offlineMessageQueue";
import type { PendingMessage } from "../../../services/offlineMessageQueue";
import { presenceService } from "../../../services/presenceService";
import type { ChatDetail, FrontendMessage, OutgoingMessageAttachment, User } from "../../../types/chat";
import type { FrontendContact } from "../../../types/contact";
import type { FrontendProfile } from "../../../types/profile";
import type { SearchChatsResult, SearchContactsResult, SearchMessagesResult } from "../../../types/search";

export type WsEventHandler<T = unknown> = (payload: T) => void;

export interface ChatsDataFacadeDeps {
    chatService: typeof chatService;
    contactService: typeof contactService;
    channelService: typeof channelService;
    offlineQueue: typeof offlineQueue;
    presenceService: typeof presenceService;
    notificationService: typeof notificationService;
    wsClient: typeof wsClient;
}

const defaultDeps: ChatsDataFacadeDeps = {
    chatService,
    contactService,
    channelService,
    offlineQueue,
    presenceService,
    notificationService,
    wsClient,
};

export class ChatsDataFacade {
    constructor(private readonly deps: ChatsDataFacadeDeps = defaultDeps) {}

    public getCurrentProfile(): Promise<FrontendProfile> {
        return this.deps.contactService.getMyProfile();
    }

    public getCurrentUserId(): Promise<number> {
        return this.deps.contactService.getMyId();
    }

    public getProfileInfo(profileId: number | null): Promise<FrontendProfile> {
        return this.deps.contactService.getProfileInfo(profileId);
    }

    public getUserProfile(userId: number): Promise<User | null> {
        return this.deps.chatService.getUserProfile(userId);
    }

    public getIdByLogin(login: string): Promise<{ id: number | null; status: number }> {
        return this.deps.contactService.getIdByLogin(login);
    }

    public getContacts(): Promise<FrontendContact[]> {
        return this.deps.contactService.getContacts();
    }

    public searchContacts(
        query: string,
        scope: "contacts" | "local" = "contacts",
        beforeId: number | null = null,
        limit = 20,
    ): Promise<SearchContactsResult | null> {
        return this.deps.contactService.searchContacts(query, scope, beforeId, limit);
    }

    public getChats(currentUserId?: string | number): Promise<ChatDetail[]> {
        return this.deps.chatService.getChats(currentUserId);
    }

    public searchChats(
        query: string,
        type: "" | "group" | "channel" = "",
        beforeId: number | null = null,
        limit = 20,
    ): Promise<SearchChatsResult | null> {
        return this.deps.chatService.searchChats(query, type, beforeId, limit);
    }

    public getChatDetail(chatId: string): Promise<ChatDetail | undefined> {
        return this.deps.chatService.getChatDetail(chatId);
    }

    public getChatMembers(chatId: string): Promise<number[]> {
        return this.deps.chatService.getChatMembers(chatId);
    }

    public createChat(
        memberIds: number[],
        type: "dialog" | "group" | "channel",
        title?: string,
    ): Promise<{ success: boolean; status: number; body?: { id?: string | number; chat_id?: string | number } }> {
        return this.deps.chatService.createChat(memberIds, type, title);
    }

    public findExistingDialogChatId(targetId: number, targetLogin?: string): Promise<string | undefined> {
        return this.deps.chatService.findExistingDialogChatId(targetId, targetLogin);
    }

    public deleteChat(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string }> {
        return this.deps.chatService.deleteChat(chatId);
    }

    public leaveChat(chatId: string | number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.deps.chatService.leaveChat(Number(chatId));
    }

    public leaveGroup(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.deps.chatService.leaveGroup(chatId);
    }

    public joinChat(chatId: string | number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.deps.chatService.joinChat(chatId);
    }

    public updateChatTitle(chatId: string, title: string): Promise<boolean> {
        return this.deps.chatService.updateChatTitle(chatId, title);
    }

    public updateChatDescription(chatId: string, description: string): Promise<boolean> {
        return this.deps.chatService.updateChatDescription(chatId, description);
    }

    public updateChatAvatar(chatId: string, file: File): Promise<boolean> {
        return this.deps.chatService.updateChatAvatar(chatId, file);
    }

    public addMembersToChat(chatId: string, userIds: number[]): Promise<{ success: boolean; status: number; errorCode?: string }> {
        return this.deps.chatService.addMembersToChat(chatId, userIds);
    }

    public removeMember(chatId: string, userId: number): Promise<{ success: boolean; status: number }> {
        return this.deps.chatService.removeMember(chatId, userId);
    }

    public getMessages(
        chatId: string,
        currentUserId: number,
        beforeId: number | null = null,
    ): Promise<{ messages: FrontendMessage[]; hasMore: boolean; nextBeforeId: number | null } | null> {
        return this.deps.chatService.getMessages(chatId, currentUserId, beforeId);
    }

    public sendMessage(
        chatId: string,
        text: string,
        senderId: number,
        attachments: OutgoingMessageAttachment[] = [],
    ): Promise<PendingMessage> {
        return this.deps.chatService.sendMessage(chatId, text, senderId, attachments);
    }

    public uploadMessageAttachment(file: File, type: "photo" | "video" | "file") {
        return this.deps.chatService.uploadMessageAttachment(file, type);
    }

    public editMessage(chatId: string, messageId: string, text: string): boolean {
        return this.deps.chatService.editMessage(chatId, messageId, text);
    }

    public deleteMessage(chatId: string, messageId: string): boolean {
        return this.deps.chatService.deleteMessage(chatId, messageId);
    }

    public markMessageRead(chatId: string, messageId: string): boolean {
        return this.deps.chatService.markMessageRead(chatId, messageId);
    }

    public resolveServerMessage(dto: MessageDto, currentUserId: number): Promise<string | null> {
        return this.deps.chatService.resolveServerMessage(dto, currentUserId);
    }

    public convertWsMessageDto(dto: MessageDto, currentUserId: number | string): FrontendMessage {
        return this.deps.chatService.convertWsMessageDto(dto, currentUserId);
    }

    public mapChatDtoToChat(dto: ChatInformationDto, currentUserId: number): ChatDetail {
        return this.deps.chatService.mapChatDtoToChat(dto, currentUserId);
    }

    public searchMessages(
        chatId: string,
        query: string,
        beforeId: number | null = null,
        limit = 20,
    ): Promise<SearchMessagesResult | null> {
        return this.deps.chatService.searchMessages(chatId, query, beforeId, limit);
    }

    public flushPendingMessages(): Promise<void> {
        return this.deps.chatService.flushQueue();
    }

    public clearInFlightMessages(): void {
        this.deps.chatService.clearInFlight();
    }

    public getPendingMessages(chatId: string): Promise<PendingMessage[]> {
        return this.deps.offlineQueue.getByChat(chatId);
    }

    public getAllPendingMessages(): Promise<PendingMessage[]> {
        return this.deps.offlineQueue.getAll();
    }

    public removePendingMessage(tempId: string): Promise<void> {
        return this.deps.offlineQueue.remove(tempId);
    }

    public rejectPendingMessageFromError(error: WsErrorDto, activeChatId?: string | null): Promise<string | null> {
        return this.deps.chatService.rejectPendingMessageFromError(error, activeChatId);
    }

    public createChannel(
        input: CreateChannelInput,
        currentUserId: number,
    ): Promise<{ success: boolean; channelId?: string; errorCode?: string; status?: number }> {
        return this.deps.channelService.createChannel(input, currentUserId);
    }

    public getChannel(channelId: string, currentUserId: number): Promise<ChannelDetail | null> {
        return this.deps.channelService.getChannel(channelId, currentUserId);
    }

    public updateChannel(
        channelId: string,
        input: UpdateChannelInput,
        currentUserId: number,
    ): Promise<{ success: boolean; errorCode?: string }> {
        return this.deps.channelService.updateChannel(channelId, input, currentUserId);
    }

    public joinChannel(channelId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.deps.channelService.joinChannel(channelId);
    }

    public leaveChannel(channelId: string): Promise<{ success: boolean }> {
        return this.deps.channelService.leaveChannel(channelId);
    }

    public deleteChannel(channelId: string): Promise<{ success: boolean; errorCode?: string }> {
        return this.deps.channelService.deleteChannel(channelId);
    }

    public removeChannelMember(channelId: string, userId: number): Promise<{ success: boolean }> {
        return this.deps.channelService.removeMember(channelId, userId);
    }

    public subscribePresence(userId: number, handler: (state: PresenceState) => void): () => void {
        return this.deps.presenceService.subscribe(userId, handler);
    }

    public getPresence(userId: number): PresenceState | null {
        return this.deps.presenceService.get(userId);
    }

    public emitTyping(chatId: string): void {
        this.deps.presenceService.emitTyping(chatId);
    }

    public stopTyping(chatId: string): void {
        this.deps.presenceService.stopTyping(chatId);
    }

    public canRequestNotifications(): boolean {
        return this.deps.notificationService.canRequest();
    }

    public requestNotificationPermission(): Promise<boolean> {
        return this.deps.notificationService.requestPermission();
    }

    public isWsConnected(): boolean {
        return this.deps.wsClient.isConnected();
    }

    public sendWs(type: string, payload: unknown): void {
        this.deps.wsClient.send(type, payload);
    }

    public sendWsIfOpen(type: string, payload: unknown): boolean {
        return this.deps.wsClient.sendIfOpen(type, payload);
    }

    public subscribeWs<T = unknown>(eventType: string, handler: WsEventHandler<T>): () => void {
        this.deps.wsClient.subscribe<T>(eventType, handler);
        return () => this.deps.wsClient.unsubscribe<T>(eventType, handler);
    }

    public unsubscribeWs<T = unknown>(eventType: string, handler: WsEventHandler<T>): void {
        this.deps.wsClient.unsubscribe<T>(eventType, handler);
    }
}

export const chatsDataFacade = new ChatsDataFacade();
