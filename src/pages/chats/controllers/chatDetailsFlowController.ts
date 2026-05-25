import { AddMemberWindow } from "../../../components/composite/addMemberWindow/addMemberWindow";
import { ChannelDetailsWindow } from "../../../components/composite/channelDetailsWindow/channelDetailsWindow";
import { GroupDetailsWindow } from "../../../components/composite/groupDetailsWindow/groupDetailsWindow";
import type { ChannelChat, GroupChat } from "../../../types/chat";
import type { ChatDetailsController } from "./chatDetailsController";

interface ChatDetailsFlowControllerDeps {
    detailsController: ChatDetailsController;
    getCurrentUserId: () => number | null;
    getCurrentUserLogin: () => string | null;
    getChatWindowElement: () => HTMLElement | null;
    hasMainContentArea: () => boolean;
    mountInMain: (component: GroupDetailsWindow | ChannelDetailsWindow | AddMemberWindow) => void;
    syncLayout: () => void;
    showAlert: (text: string, onConfirm?: () => void) => void;
    rebuildSidebar: () => void;
    navigateChatsRoot: () => void;
    navigateContact: (login: string) => void;
    refreshActiveChat: () => Promise<void>;
}

export class ChatDetailsFlowController {
    private groupDetailsWindow: GroupDetailsWindow | null = null;
    private channelDetailsWindow: ChannelDetailsWindow | null = null;
    private addMemberWindow: AddMemberWindow | null = null;
    private requestId = 0;

    constructor(private readonly deps: ChatDetailsFlowControllerDeps) {}

    public closeAll(): void {
        this.invalidateRequests();
        this.closeAddMember();
        this.closeGroupDetails();
        this.closeChannelDetails();
    }

    public hasOpenWindow(): boolean {
        return Boolean(this.groupDetailsWindow || this.channelDetailsWindow || this.addMemberWindow);
    }

    public getOpenState(): {
        hasGroupDetailsWindow: boolean;
        hasChannelDetailsWindow: boolean;
        hasAddMemberWindow: boolean;
    } {
        return {
            hasGroupDetailsWindow: this.groupDetailsWindow !== null,
            hasChannelDetailsWindow: this.channelDetailsWindow !== null,
            hasAddMemberWindow: this.addMemberWindow !== null,
        };
    }

    public async openGroupDetails(chat: GroupChat, initialIsEditing = false): Promise<void> {
        const currentUserId = this.deps.getCurrentUserId();
        if (!this.deps.hasMainContentArea() || currentUserId === null) return;

        const requestId = this.nextRequest();
        this.closeGroupDetails();
        this.closeAddMember();
        this.hideChatWindow();

        let groupDetails;
        try {
            groupDetails = await this.deps.detailsController.loadGroupDetails(chat, currentUserId);
        } catch {
            if (this.isStaleRequest(requestId)) return;
            this.showChatWindow();
            this.deps.syncLayout();
            this.deps.showAlert("Не удалось загрузить информацию о группе");
            return;
        }

        if (this.isStaleRequest(requestId)) return;

        const members = groupDetails.members.map(member => ({
            id: member.id,
            name: member.displayName,
            avatarUrl: member.avatarUrl || "/assets/images/avatars/defaultAvatar.svg",
        }));

        this.groupDetailsWindow = new GroupDetailsWindow({
            groupId: groupDetails.id,
            groupName: groupDetails.title,
            groupAvatarUrl: groupDetails.avatarUrl || "/assets/images/avatars/defaultAvatar.svg",
            currentUserRole: groupDetails.currentUserRole,
            members,
            initialIsEditing,
            onBack: () => {
                this.closeGroupDetails();
                this.showChatWindow();
                this.deps.syncLayout();
            },
            onUpdateGroup: (newName?: string, newAvatar?: File) =>
                this.deps.detailsController.updateGroup(chat.id, newName, newAvatar),
            onLeaveGroup: async () => this.leaveGroup(chat),
            onGroupUpdated: async () => {
                this.closeGroupDetails();
                await this.deps.refreshActiveChat();
            },
            onRemoveMember: async (userId: number) => this.removeGroupMember(chat, userId),
            onAddMember: () => {
                this.openAddMemberWindow(chat);
            },
            onMemberClick: async (userId: number) => {
                const memberLogin = await this.deps.detailsController.getProfileLogin(userId);
                this.deps.navigateContact(memberLogin);
            },
        });

        this.deps.mountInMain(this.groupDetailsWindow);
        this.deps.syncLayout();
    }

    public async openChannelDetails(chat: ChannelChat): Promise<void> {
        const currentUserId = this.deps.getCurrentUserId();
        if (!this.deps.hasMainContentArea() || currentUserId === null) return;

        const requestId = this.nextRequest();
        this.closeChannelDetails();
        this.hideChatWindow();

        let channelDetail;
        try {
            channelDetail = await this.deps.detailsController.loadChannelDetails(chat, currentUserId);
        } catch {
            if (this.isStaleRequest(requestId)) return;
            this.showChatWindow();
            this.deps.syncLayout();
            this.deps.showAlert("Не удалось загрузить информацию о канале");
            return;
        }

        if (this.isStaleRequest(requestId)) return;

        if (!channelDetail) {
            this.showChatWindow();
            this.deps.syncLayout();
            this.deps.showAlert("Не удалось загрузить информацию о канале");
            return;
        }

        this.channelDetailsWindow = new ChannelDetailsWindow({
            channel: channelDetail,
            onBack: () => {
                this.closeChannelDetails();
                this.showChatWindow();
                this.deps.syncLayout();
            },
            onLeaveChannel: async () => {
                if (channelDetail.currentUserRole !== "participant") {
                    this.deps.showAlert("Вы не подписаны на этот канал", () => {
                        void this.openChannelDetails(chat);
                    });
                    return;
                }

                const res = await this.deps.detailsController.leaveChannel(chat.id);
                if (res.success) {
                    this.closeChannelDetails();
                    this.closeActiveChat();
                    return;
                }

                this.deps.showAlert("Не удалось покинуть канал", () => {
                    void this.openChannelDetails(chat);
                });
            },
            onDeleteChannel: async () => {
                const res = await this.deps.detailsController.deleteChannel(chat.id);
                if (res.success) {
                    this.closeChannelDetails();
                    this.closeActiveChat();
                    return;
                }

                const errorMsg = res.errorCode === "CANT_DELETE_CHAT"
                    ? "Вы не можете удалить этот канал"
                    : "Не удалось удалить канал";
                this.deps.showAlert(errorMsg, () => {
                    void this.openChannelDetails(chat);
                });
            },
            onUpdateChannel: async (title?: string, description?: string, avatar?: File) => {
                const userId = this.deps.getCurrentUserId();
                if (userId === null) return { success: false };
                return this.deps.detailsController.updateChannel(chat.id, { title, description, avatar }, userId);
            },
            onChannelUpdated: async () => {
                this.closeChannelDetails();
                await this.deps.refreshActiveChat();
            },
            onRemoveMember: async (userId: number) => {
                const res = await this.deps.detailsController.removeChannelMember(chat.id, userId);
                if (!res.success) {
                    this.deps.showAlert("Не удалось удалить участника", () => {
                        void this.openChannelDetails(chat);
                    });
                    return false;
                }
                return true;
            },
            onMemberClick: async (userId: number) => {
                const memberLogin = await this.deps.detailsController.getProfileLogin(userId);
                this.deps.navigateContact(memberLogin);
            },
        });

        this.deps.mountInMain(this.channelDetailsWindow);
        this.deps.syncLayout();
    }

    private openAddMemberWindow(chat: GroupChat): void {
        if (!this.deps.hasMainContentArea()) return;

        this.closeAddMember();
        if (this.groupDetailsWindow?.element) {
            this.groupDetailsWindow.element.style.display = "none";
        }

        this.addMemberWindow = new AddMemberWindow({
            onBack: () => {
                this.closeAddMember();
                if (this.groupDetailsWindow?.element) {
                    this.groupDetailsWindow.element.style.display = "flex";
                }
                this.deps.syncLayout();
            },
            onSubmitSearch: async (login: string) => this.addMemberByLogin(chat, login),
        });

        this.deps.mountInMain(this.addMemberWindow);
        this.deps.syncLayout();
    }

    private async leaveGroup(chat: GroupChat): Promise<void> {
        const res = await this.deps.detailsController.leaveGroup(chat.id);
        if (res.success) {
            this.closeGroupDetails();
            this.closeActiveChat();
            return;
        }

        let errorMsg = "Не удалось покинуть группу";
        if (res.status === 403 || res.errorCode === "CANT_LEAVE_OWN_CHAT") {
            errorMsg = "У вас нет прав для выхода (вы владелец)";
        } else if (res.status === 400) {
            errorMsg = "Неверный запрос или попытка выхода из личного диалога";
        } else if (res.status === 404) {
            errorMsg = "Чат не найден";
        } else if (res.errorMessage) {
            errorMsg = res.errorMessage;
        } else if (res.errorCode) {
            errorMsg = `Ошибка: ${res.errorCode}`;
        }

        this.deps.showAlert(errorMsg, () => {
            void this.openGroupDetails(chat);
        });
    }

    private async removeGroupMember(chat: GroupChat, userId: number): Promise<boolean> {
        const res = await this.deps.detailsController.removeGroupMember(chat.id, userId);
        if (res.success) return true;

        let errorMsg = "Произошла ошибка при удалении участника";
        if (res.status === 403) {
            errorMsg = "Только владелец может удалять участников";
        } else if (res.status === 400) {
            errorMsg = "Невозможно удалить владельца чата";
        }

        this.deps.showAlert(errorMsg, () => {
            void this.openGroupDetails(chat);
        });
        return false;
    }

    private async addMemberByLogin(chat: GroupChat, login: string): Promise<string | undefined> {
        const targetLogin = login.trim().toLowerCase();
        const currentLogin = this.deps.getCurrentUserLogin()?.toLowerCase();
        if (currentLogin && currentLogin === targetLogin) {
            return "Вы не можете добавить самого себя в чат!";
        }

        const targetUserRes = await this.deps.detailsController.getUserIdByLogin(login);
        if (targetUserRes.status === 404 || !targetUserRes.id) {
            return `Пользователь с логином "${login}" не найден!`;
        }

        const res = await this.deps.detailsController.addMembersToGroup(chat.id, [targetUserRes.id]);
        if (res.success) {
            this.closeAddMember();
            this.closeGroupDetails();
            await this.deps.refreshActiveChat();
            return undefined;
        }

        if (res.errorCode === "MEMBER_ALREADY_IN_CHAT") {
            return "Пользователь уже в чате";
        }
        if (res.status === 403) {
            return "Только владелец может добавлять новых участников";
        }
        if (res.status === 400) {
            return "Неверный запрос (проверьте данные)";
        }
        return "Не удалось добавить участника";
    }

    private closeActiveChat(): void {
        this.invalidateRequests();
        this.deps.rebuildSidebar();
        this.deps.navigateChatsRoot();
    }

    private hideChatWindow(): void {
        const chatWindowEl = this.deps.getChatWindowElement();
        if (chatWindowEl) chatWindowEl.style.display = "none";
    }

    private showChatWindow(): void {
        const chatWindowEl = this.deps.getChatWindowElement();
        if (chatWindowEl) chatWindowEl.style.display = "flex";
    }

    private closeGroupDetails(): void {
        this.groupDetailsWindow?.unmount();
        this.groupDetailsWindow = null;
    }

    private closeChannelDetails(): void {
        this.channelDetailsWindow?.unmount();
        this.channelDetailsWindow = null;
    }

    private closeAddMember(): void {
        this.addMemberWindow?.unmount();
        this.addMemberWindow = null;
    }

    private nextRequest(): number {
        this.requestId += 1;
        return this.requestId;
    }

    private invalidateRequests(): void {
        this.requestId += 1;
    }

    private isStaleRequest(requestId: number): boolean {
        return requestId !== this.requestId || !this.deps.hasMainContentArea();
    }
}
