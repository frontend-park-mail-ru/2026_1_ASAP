import type { BaseComponent } from "../../../core/base/baseComponent";
import type { ChannelRole } from "../../../services/channelService";
import type { FrontendProfile } from "../../../types/profile";
import type { FrontendMessage, MessageAttachment } from "../../../types/chat";
import { httpClient } from "../../../core/utils/httpClient";
import { ChannelJoinFooter } from "../../../components/composite/channelJoinFooter/channelJoinFooter";
import { MessageList } from "../../../components/composite/messageList/messageList";
import { MessageInput } from "../../../components/ui/messageInput/messageInput";
import { stickerService } from "../../../services/stickerService";
import { speechToTextService } from "../../../services/speechToTextService";
import type { ActiveChatVM } from "../model/chatsViewModels";
import type { ChatSessionController } from "./chatSessionController";

interface ChatActiveMessagesControllerDeps {
    sessionController: ChatSessionController;
    getCurrentUserId: () => number | null;
    getCurrentUserProfile: () => FrontendProfile | null;
    getActiveChatId: () => string | null;
    getActiveChannelRole: () => ChannelRole | null;
    getMessageList: () => MessageList | null;
    getMessageInput: () => MessageInput | null;
    getPaginationState: () => { hasMoreHistory: boolean; nextBeforeId: number | null };
    setPaginationState: (state: { hasMoreHistory: boolean; nextBeforeId: number | null }) => void;
    onShowAlert: (text: string) => void;
    onEmitTyping: (chatId: string) => void;
    onStopTyping: (chatId: string) => void;
    onJoinChannel: (chatId: string) => Promise<void>;
    onContactClick: (userId: number) => void;
    /** Сколько непрочитанных у чата на момент открытия (захватываем до resetUnread). */
    getPendingUnreadCount: (chatId: string) => number;
    /** ID последнего прочитанного сообщения — главный источник истины для якоря «новые». */
    getLastReadMessageId: (chatId: string) => number;
    /** Локально применить «я прочитал до этого id» (не дожидаясь WS-broadcast). */
    onLocalMarkRead: (chatId: string, lastReadMessageId: number) => void;
}

export interface ActiveChatMessagesResult {
    messageListComponent: MessageList;
    messageInputComponent: MessageInput | null;
    footerComponent: BaseComponent | undefined;
}

export class ChatActiveMessagesController {
    constructor(private readonly deps: ChatActiveMessagesControllerDeps) {}

    public build(chatId: string, activeState: ActiveChatVM): ActiveChatMessagesResult {
        const chatDetail = activeState.chat;

        const messageListComponent = new MessageList({
            messages: activeState.messages,
            currentUser: {
                id: activeState.currentUser.id,
                login: activeState.currentUser.login,
                avatarUrl: activeState.currentUser.avatarUrl,
            },
            chatType: chatDetail.type,
            chatAvatarUrl: chatDetail.type === "channel" ? (chatDetail.avatarUrl || undefined) : undefined,
            unreadCount: this.deps.getPendingUnreadCount(chatId),
            lastReadMessageId: this.deps.getLastReadMessageId(chatId),
            onDownloadAttachment: (url, fileName) => this.downloadAttachment(url, fileName),
            onTranscribe: async (messageId, url) => {
                const res = await speechToTextService.transcribeVoice(messageId, url);
                if (res.success && res.text) {
                    return res.text;
                }
                throw new Error(res.error || "Не удалось расшифровать аудиозапись");
            },
            getCachedTranscription: (messageId) => speechToTextService.getCached(messageId),
            onLoadMore: async () => {
                const { hasMoreHistory, nextBeforeId } = this.deps.getPaginationState();
                const currentUserId = this.deps.getCurrentUserId();
                const activeChatId = this.deps.getActiveChatId();
                if (!hasMoreHistory || !nextBeforeId || currentUserId === null || activeChatId !== chatDetail.id) return;

                const res = await this.deps.sessionController.loadMoreMessages(chatDetail, currentUserId, nextBeforeId);
                if (res === null) return;

                if (this.deps.getActiveChatId() !== chatDetail.id || this.deps.getMessageList() !== messageListComponent) {
                    return;
                }

                this.deps.setPaginationState({
                    hasMoreHistory: res.hasMore,
                    nextBeforeId: res.nextBeforeId,
                });
                messageListComponent.prependMessages(res.messages);
            },
            onRequestEdit: (messageId, currentText) => {
                this.deps.getMessageInput()?.enterEditMode(messageId, currentText);
            },
            onRequestDelete: (messageId) => {
                const activeChatId = this.deps.getActiveChatId();
                if (!activeChatId || activeChatId !== chatId) return;

                const ok = this.deps.sessionController.deleteMessage(activeChatId, messageId);
                if (!ok) {
                    this.deps.onShowAlert("No connection, try later");
                }
            },
            onContactClick: this.deps.onContactClick,
        });

        let footerComponent: BaseComponent | undefined;
        let messageInputComponent: MessageInput | null = null;

        if (activeState.permissions.canWrite) {
            messageInputComponent = this.buildMessageInput(chatId, activeState, messageListComponent);
            footerComponent = messageInputComponent;
        } else if (activeState.permissions.canJoin) {
            footerComponent = new ChannelJoinFooter({
                onJoin: () => this.deps.onJoinChannel(chatId),
            });
        }

        return {
            messageListComponent,
            messageInputComponent,
            footerComponent,
        };
    }

    public restorePendingMessages(pendingMessages: ActiveChatVM["pendingMessages"]): void {
        const messageList = this.deps.getMessageList();
        const currentUserId = this.deps.getCurrentUserId();
        if (!messageList || currentUserId === null || pendingMessages.length === 0) return;

        const profile = this.deps.getCurrentUserProfile();
        pendingMessages.forEach((pending) => {
            messageList.addMessage({
                id: pending.tempId,
                sender: {
                    id: pending.senderId,
                    login: profile?.additionalInfo.login || "",
                    avatarUrl: profile?.mainInfo.avatarUrl,
                    firstName: profile?.mainInfo.firstName,
                    lastName: profile?.mainInfo.lastName,
                },
                text: pending.text,
                timestamp: new Date(pending.createdAt),
                isOwn: true,
                status: "sending",
                attachments: pending.attachments?.map((attachment): MessageAttachment => ({
                    type: attachment.type,
                    url: attachment.url,
                    fileName: attachment.file_name,
                    contactUserId: attachment.contact_user_id,
                })),
            });
        });
    }

    public markLatestIncomingRead(chatId: string): void {
        // Берём самое свежее ВХОДЯЩЕЕ сообщение, даже если последнее в чате —
        // моё. Иначе бэк не сдвинет last_read_message_id и после перезагрузки
        // непрочитанные «оживут» снова.
        const latestIncoming = this.deps.getMessageList()?.getLatestIncomingMessageData();
        if (!latestIncoming) return;

        const lastReadId = Number(latestIncoming.id);
        if (!Number.isFinite(lastReadId) || lastReadId <= 0) return;

        // Уже отмечено — не повторяемся (бэк проигнорирует, мы не дёргаем зря).
        if (this.deps.getLastReadMessageId(chatId) >= lastReadId) return;

        this.deps.sessionController.markMessageRead(chatId, latestIncoming.id);
        // Оптимистичный апдейт — на случай если WS-broadcast не дойдёт сразу.
        // Иначе при повторном входе в чат до прихода эхо-события divider
        // покажется снова на тех же сообщениях.
        this.deps.onLocalMarkRead(chatId, lastReadId);
    }

    private buildMessageInput(
        chatId: string,
        activeState: ActiveChatVM,
        messageListComponent: MessageList,
    ): MessageInput {
        const chatDetail = activeState.chat;

        return new MessageInput({
            onSubmit: async (text, attachments, draftAttachments) => {
                const activeChatId = this.deps.getActiveChatId();
                const currentUserId = this.deps.getCurrentUserId();
                if (!activeChatId || activeChatId !== chatId || currentUserId === null) return;
                if (chatDetail.type === "channel" && this.deps.getActiveChannelRole() !== "owner") return;

                const pending = await this.deps.sessionController.sendMessage(activeChatId, text, currentUserId, attachments);
                if (this.deps.getActiveChatId() !== chatId || this.deps.getMessageList() !== messageListComponent) {
                    return;
                }

                const profile = this.deps.getCurrentUserProfile();
                const optimistic: FrontendMessage = {
                    id: pending.tempId,
                    sender: {
                        id: currentUserId,
                        login: profile?.additionalInfo.login || "",
                        avatarUrl: profile?.mainInfo.avatarUrl,
                        firstName: profile?.mainInfo.firstName,
                        lastName: profile?.mainInfo.lastName,
                    },
                    text,
                    timestamp: new Date(pending.createdAt),
                    isOwn: true,
                    status: "sending",
                    attachments: draftAttachments,
                };
                messageListComponent.addMessage(optimistic);
            },
            onUploadFile: async (file, type) => {
                const result = await this.deps.sessionController.uploadMessageAttachment(file, type);
                if (!result.success) return result;
                return {
                    success: true,
                    attachment: result.attachment,
                    outgoing: result.outgoing,
                };
            },
            onLoadContacts: () => this.deps.sessionController.loadContacts(),
            onSubmitEdit: (messageId, newText) => {
                const activeChatId = this.deps.getActiveChatId();
                if (!activeChatId || activeChatId !== chatId) return;
                if (chatDetail.type === "channel" && this.deps.getActiveChannelRole() !== "owner") return;

                const ok = this.deps.sessionController.editMessage(activeChatId, messageId, newText);
                if (!ok) {
                    this.deps.onShowAlert("No connection, try later");
                }
            },
            onSendSticker: (sticker) => {
                const activeChatId = this.deps.getActiveChatId();
                if (!activeChatId || activeChatId !== chatId) return;
                if (chatDetail.type === "channel" && this.deps.getActiveChannelRole() !== "owner") return;

                const ok = stickerService.sendSticker(activeChatId, sticker.id);
                if (!ok) {
                    this.deps.onShowAlert("Нет соединения, попробуйте позже");
                }
            },
            onTyping: () => {
                const activeChatId = this.deps.getActiveChatId();
                if (activeChatId === chatId) this.deps.onEmitTyping(activeChatId);
            },
            onStopTyping: () => {
                const activeChatId = this.deps.getActiveChatId();
                if (activeChatId === chatId) this.deps.onStopTyping(activeChatId);
            },
            chatId,
        });
    }
    /**
     * Скачивает вложение через httpClient (CSRF-safe) с fallback на window.open.
     * Blob-ссылка ревокируется сразу после инициации скачивания.
     */
    private async downloadAttachment(url: string, fileName: string): Promise<void> {
        try {
            const response = await httpClient.request(url, { credentials: 'include' });
            if (!response.ok) {
                window.open(url, '_blank', 'noopener');
                return;
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fileName;
            link.rel = 'noopener';
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Ревокируем сразу — утечки памяти нет
            URL.revokeObjectURL(objectUrl);
        } catch {
            window.open(url, '_blank', 'noopener');
        }
    }
}
