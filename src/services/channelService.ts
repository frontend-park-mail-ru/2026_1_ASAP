import { chatService } from './chatService';
import type { ChannelChat } from '../types/chat';

export type ChannelRole = 'owner' | 'participant' | 'guest';

export interface ChannelMember {
    id: number;
    name: string;
    avatarUrl?: string;
    isOwner: boolean;
}

export interface ChannelDetail {
    id: string;
    title: string;
    avatarUrl?: string;
    description: string;
    inviteUrl: string;
    members: ChannelMember[];
    subscribersCount: number;
    currentUserRole: ChannelRole;
    ownerId: number;
}

export interface CreateChannelInput {
    title: string;
    description?: string;
    // avatar?: File; // TODO: бэк не принимает аватар при создании, ставить через updateChannel после
}

export interface UpdateChannelInput {
    title?: string;
    description?: string;
    avatar?: File;
}

class ChannelService {
    private generateInviteUrl(channelId: string): string {
        return `https://pulseapp.space/chats/${channelId}`;
    }

    async createChannel(
        input: CreateChannelInput,
        _myId: number
    ): Promise<{ success: boolean; channelId?: string; errorCode?: string; status?: number }> {
        const res = await chatService.createChat(
            [],        // members_id — бэк добавляет owner автоматически
            'channel',
            input.title,
        );

        if (!res.success || !res.body?.id) {
            return { success: false, status: res.status };
        }

        const channelId = res.body.id.toString();

        if (input.description) {
            await chatService.updateChatDescription(channelId, input.description);
        }

        return { success: true, channelId, status: res.status };
    }

    async getChannel(channelId: string, myId: number): Promise<ChannelDetail | null> {
        const chatDetail = await chatService.getChatDetail(channelId);
        if (!chatDetail || chatDetail.type !== 'channel') return null;

        const channelDetail = chatDetail as ChannelChat;
        const memberIds = await chatService.getChatMembers(channelId);
        const ownerId: number = (chatDetail as any).owner_id || 0;
        const currentUserRole: ChannelRole =
            ownerId !== 0 && ownerId === myId
                ? 'owner'
                : memberIds.includes(myId)
                    ? 'participant'
                    : 'guest';

        const memberProfiles = await Promise.all(
            memberIds.map(id => chatService.getUserProfile(id))
        );

        const members: ChannelMember[] = memberProfiles
            .map((profile, i) => {
                if (!profile) return null;
                const displayName =
                    [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.login;
                return {
                    id: memberIds[i],
                    name: displayName,
                    avatarUrl: profile.avatarUrl,
                    isOwner: memberIds[i] === ownerId,
                };
            })
            .filter((m) => m !== null) as ChannelMember[];

        return {
            id: channelId,
            title: chatDetail.title,
            avatarUrl: chatDetail.avatarUrl,
            description: channelDetail.description ?? '',
            inviteUrl: this.generateInviteUrl(channelId),
            members,
            subscribersCount: (chatDetail as any).subscribersCount || memberIds.length,
            currentUserRole,
            ownerId,
        };
    }

    async updateChannel(
        channelId: string,
        input: UpdateChannelInput,
        myId: number
    ): Promise<{ success: boolean; errorCode?: string }> {
        const detail = await this.getChannel(channelId, myId);
        if (!detail) return { success: false, errorCode: 'CHANNEL_NOT_FOUND' };

        if (detail.currentUserRole !== 'owner') {
            if (input.title !== undefined) return { success: false, errorCode: 'YOU_CANT_CHANGE_TITLE' };
            if (input.avatar !== undefined) return { success: false, errorCode: 'YOU_CANT_CHANGE_AVATAR' };
        }

        const promises: Promise<boolean>[] = [];

        if (input.title) {
            promises.push(chatService.updateChatTitle(channelId, input.title));
        }
        if (input.avatar) {
            promises.push(chatService.updateChatAvatar(channelId, input.avatar));
        }
        if (input.description !== undefined) {
            promises.push(chatService.updateChatDescription(channelId, input.description));
        }

        if (promises.length > 0) {
            const results = await Promise.all(promises);
            if (!results.every(r => r)) return { success: false };
        }

        return { success: true };
    }

    async joinChannel(channelId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return chatService.joinChat(channelId);
    }

    async leaveChannel(channelId: string): Promise<{ success: boolean }> {
        const res = await chatService.leaveChat(Number(channelId));
        return { success: res.success };
    }

    async deleteChannel(channelId: string): Promise<{ success: boolean; errorCode?: string }> {
        const res = await chatService.deleteChat(channelId);
        return { success: res.success, errorCode: res.errorCode };
    }

    async removeMember(channelId: string, userId: number): Promise<{ success: boolean }> {
        const res = await chatService.removeMember(channelId, userId);
        return { success: res.success };
    }
}

export const channelService = new ChannelService();
