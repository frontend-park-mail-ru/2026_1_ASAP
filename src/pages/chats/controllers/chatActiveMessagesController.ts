import type { BaseComponent } from "../../../core/base/baseComponent";
import type { ChannelRole } from "../../../services/channelService";
import type { FrontendProfile } from "../../../types/profile";
import type { FrontendMessage } from "../../../types/chat";
import { ChannelJoinFooter } from "../../../components/composite/channelJoinFooter/channelJoinFooter";
import { MessageList } from "../../../components/composite/messageList/messageList";
import { MessageInput } from "../../../components/ui/messageInput/messageInput";
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
            });
        });
    }

    public markLatestIncomingRead(chatId: string): void {
        const last = this.deps.getMessageList()?.getLatestMessageData();
        if (last && !last.isOwn && /^\d+$/.test(last.id)) {
            this.deps.sessionController.markMessageRead(chatId, last.id);
        }
    }

    private buildMessageInput(
        chatId: string,
        activeState: ActiveChatVM,
        messageListComponent: MessageList,
    ): MessageInput {
        const chatDetail = activeState.chat;

        return new MessageInput({
            onSubmit: async (text: string) => {
                const activeChatId = this.deps.getActiveChatId();
                const currentUserId = this.deps.getCurrentUserId();
                if (!activeChatId || activeChatId !== chatId || currentUserId === null) return;
                if (chatDetail.type === "channel" && this.deps.getActiveChannelRole() !== "owner") return;

                const pending = await this.deps.sessionController.sendMessage(activeChatId, text, currentUserId);
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
                };
                messageListComponent.addMessage(optimistic);
            },
            onSubmitEdit: (messageId, newText) => {
                const activeChatId = this.deps.getActiveChatId();
                if (!activeChatId || activeChatId !== chatId) return;
                if (chatDetail.type === "channel" && this.deps.getActiveChannelRole() !== "owner") return;

                const ok = this.deps.sessionController.editMessage(activeChatId, messageId, newText);
                if (!ok) {
                    this.deps.onShowAlert("No connection, try later");
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
}
