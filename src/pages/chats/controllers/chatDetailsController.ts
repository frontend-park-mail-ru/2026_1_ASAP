import type { UpdateChannelInput } from "../../../services/channelService";
import type { ChannelChat, GroupChat } from "../../../types/chat";
import { chatsUseCases, type ChatsUseCases } from "../model/chatsUseCases";
import type { ChannelDetailsVM, GroupDetailsVM } from "../model/chatsViewModels";

interface ChatDetailsControllerDeps {
    useCases?: ChatsUseCases;
}

export class ChatDetailsController {
    private readonly useCases: ChatsUseCases;

    constructor(deps: ChatDetailsControllerDeps = {}) {
        this.useCases = deps.useCases ?? chatsUseCases;
    }

    public loadGroupDetails(chat: GroupChat, currentUserId: number): Promise<GroupDetailsVM> {
        return this.useCases.loadGroupDetails(chat, currentUserId);
    }

    public updateGroup(
        chatId: string,
        title?: string,
        avatar?: File,
    ): Promise<{ success: boolean; errorCode?: string }> {
        return this.useCases.updateGroup(chatId, title, avatar);
    }

    public leaveGroup(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.useCases.leaveGroup(chatId);
    }

    public removeGroupMember(chatId: string, userId: number): Promise<{ success: boolean; status: number }> {
        return this.useCases.removeGroupMember(chatId, userId);
    }

    public getUserIdByLogin(login: string): Promise<{ id: number | null; status: number }> {
        return this.useCases.getUserIdByLogin(login);
    }

    public addMembersToGroup(chatId: string, userIds: number[]): Promise<{ success: boolean; status: number; errorCode?: string }> {
        return this.useCases.addMembersToGroup(chatId, userIds);
    }

    public loadChannelDetails(chat: ChannelChat, currentUserId: number): Promise<ChannelDetailsVM | null> {
        return this.useCases.loadChannelDetails(chat, currentUserId);
    }

    public updateChannel(
        channelId: string,
        input: UpdateChannelInput,
        currentUserId: number,
    ): Promise<{ success: boolean; errorCode?: string }> {
        return this.useCases.updateChannel(channelId, input, currentUserId);
    }

    public joinChannel(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.useCases.joinChannel(chatId);
    }

    public leaveChannel(chatId: string): Promise<{ success: boolean }> {
        return this.useCases.leaveChannel(chatId);
    }

    public deleteChannel(chatId: string): Promise<{ success: boolean; errorCode?: string }> {
        return this.useCases.deleteChannel(chatId);
    }

    public removeChannelMember(chatId: string, userId: number): Promise<{ success: boolean }> {
        return this.useCases.removeChannelMember(chatId, userId);
    }

    public getProfileLogin(userId: number): Promise<string> {
        return this.useCases.getProfileLogin(userId);
    }
}
