import type { BaseComponent } from "../../../core/base/baseComponent";
import type { PresenceState } from "../../../core/utils/wsClient";
import type { ChannelRole } from "../../../services/channelService";
import type { ChannelChat, Chat, DialogChat, GroupChat } from "../../../types/chat";
import { ChannelHeader } from "../../../components/composite/channelHeader/channelHeader";
import { DialogHeader } from "../../../components/composite/dialogHeader/dialogHeader";
import { GroupHeader } from "../../../components/composite/groupHeader/groupHeader";
import type { ActiveChatVM } from "../model/chatsViewModels";
import type { ChatDetailsController } from "./chatDetailsController";
import type { ChatSessionController } from "./chatSessionController";

interface ChatActiveHeaderControllerDeps {
    sessionController: ChatSessionController;
    detailsController: ChatDetailsController;
    onChatClosed: () => void;
    onNavigateToProfile: (login: string) => void;
    onOpenSearch: (chat: Chat) => void;
    onOpenGroupDetails: (chat: GroupChat) => void;
    onOpenChannelDetails: (chat: ChannelChat) => void;
    onShowAlert: (text: string, onConfirm?: () => void) => void;
    onWatchDialogInterlocutor: (userId: number, onPresence: (state: PresenceState) => void) => void;
}

export interface ActiveChatHeaderResult {
    headerComponent: BaseComponent;
    groupHeader: GroupHeader | null;
    channelHeader: ChannelHeader | null;
    channelRole: ChannelRole | null;
}

export class ChatActiveHeaderController {
    constructor(private readonly deps: ChatActiveHeaderControllerDeps) {}

    public build(chatId: string, activeState: ActiveChatVM): ActiveChatHeaderResult {
        const chatDetail = activeState.chat;

        switch (chatDetail.type) {
        case "dialog":
            return this.buildDialogHeader(chatId, activeState, chatDetail as DialogChat);
        case "group":
            return this.buildGroupHeader(chatId, activeState, chatDetail as GroupChat);
        case "channel":
            return this.buildChannelHeader(chatId, activeState, chatDetail as ChannelChat);
        }
    }

    private buildDialogHeader(
        chatId: string,
        activeState: ActiveChatVM,
        dialogChat: DialogChat,
    ): ActiveChatHeaderResult {
        const interlocutorLogin = dialogChat.interlocutor.login || String(dialogChat.interlocutor.id);
        const dialogHeader = new DialogHeader({
            chat: dialogChat,
            initialPresence: activeState.header.type === "dialog" ? activeState.header.presence : null,
            onOpenProfile: () => this.deps.onNavigateToProfile(interlocutorLogin),
            onOpenSearch: () => this.deps.onOpenSearch(dialogChat),
            onDeleteChat: async () => {
                const res = await this.deps.sessionController.deleteChat(chatId);
                if (res.success) {
                    this.deps.onChatClosed();
                    return;
                }

                const errorMsg = res.errorCode === "CANT_DELETE_CHAT"
                    ? "Вы не можете удалить этот чат"
                    : "Не удалось удалить диалог";
                this.deps.onShowAlert(errorMsg);
            },
        });

        if (dialogChat.interlocutor.id) {
            this.deps.onWatchDialogInterlocutor(
                dialogChat.interlocutor.id,
                (state) => dialogHeader.setPresence(state),
            );
        }

        return {
            headerComponent: dialogHeader,
            groupHeader: null,
            channelHeader: null,
            channelRole: null,
        };
    }

    private buildGroupHeader(
        chatId: string,
        activeState: ActiveChatVM,
        groupChat: GroupChat,
    ): ActiveChatHeaderResult {
        const groupRole = activeState.header.type === "group"
            ? activeState.header.currentUserRole
            : "member";
        groupChat.currentUserRole = groupRole;

        const groupHeader = new GroupHeader({
            chat: groupChat,
            currentUserRole: groupRole,
            membersCount: activeState.header.type === "group" ? activeState.header.membersCount : 0,
            currentUserId: activeState.currentUser.id,
            onOpenSearch: () => this.deps.onOpenSearch(groupChat),
            onDeleteChat: async () => {
                const res = await this.deps.sessionController.deleteChat(chatId);
                if (res.success) {
                    this.deps.onChatClosed();
                    return;
                }

                let errorMsg = "Не удалось удалить группу";
                if (res.errorCode === "CANT_DELETE_CHAT" || res.status === 403) {
                    errorMsg = "Нет прав на удаление чата (вы не владелец)";
                }
                this.deps.onShowAlert(errorMsg, () => {
                    this.deps.onOpenGroupDetails(groupChat);
                });
            },
            onLeaveGroup: async () => {
                const res = await this.deps.sessionController.leaveChat(Number(chatId));
                if (res.success) {
                    this.deps.onChatClosed();
                    return;
                }

                this.deps.onShowAlert("Не удалось выйти из группы");
            },
            onOpenGroupInfo: () => this.deps.onOpenGroupDetails(groupChat),
        });

        return {
            headerComponent: groupHeader,
            groupHeader,
            channelHeader: null,
            channelRole: null,
        };
    }

    private buildChannelHeader(
        chatId: string,
        activeState: ActiveChatVM,
        channelChat: ChannelChat,
    ): ActiveChatHeaderResult {
        const channelRole = activeState.header.type === "channel"
            ? activeState.header.currentUserRole
            : "guest";

        const channelHeader = new ChannelHeader({
            chat: channelChat,
            currentUserRole: channelRole,
            onDeleteChat: async () => {
                const res = await this.deps.detailsController.deleteChannel(chatId);
                if (res.success) {
                    this.deps.onChatClosed();
                    return;
                }

                const errorMsg = res.errorCode === "CANT_DELETE_CHAT"
                    ? "Вы не можете удалить этот канал"
                    : "Не удалось удалить канал";
                this.deps.onShowAlert(errorMsg);
            },
            onLeaveChannel: async () => {
                if (channelRole !== "participant") {
                    this.deps.onShowAlert("Вы не подписаны на этот канал");
                    return;
                }

                const res = await this.deps.detailsController.leaveChannel(chatId);
                if (res.success) {
                    this.deps.onChatClosed();
                    return;
                }

                this.deps.onShowAlert("Не удалось покинуть канал");
            },
            onOpenChannelInfo: () => this.deps.onOpenChannelDetails(channelChat),
            onOpenSearch: () => this.deps.onOpenSearch(channelChat),
        });

        return {
            headerComponent: channelHeader,
            groupHeader: null,
            channelHeader,
            channelRole,
        };
    }
}
