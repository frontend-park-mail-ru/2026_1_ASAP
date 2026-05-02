import { chatService } from './chatService';

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
    // TODO: нет бэкенд-поля, хранится локально в extraData
    description: string;
    // TODO: нет бэкенд-эндпоинта для инвайт-ссылок
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

interface ChannelExtraData {
    description: string;
    inviteUrl: string;
}

class ChannelService {
    // Хранит description и inviteUrl локально, пока бэк не поддерживает эти поля в API
    private extraData: Map<string, ChannelExtraData> = new Map();

    private generateInviteUrl(channelId: string): string {
        // TODO: заменить на реальный эндпоинт приглашений, когда появится на бэкенде
        return `https://pulseapp.space/invite/${channelId}`;
    }

    async createChannel(
        input: CreateChannelInput,
        _myId: number
    ): Promise<{ success: boolean; channelId?: string; errorCode?: string; status?: number }> {
        const res = await chatService.createChat(
            [],        // members_id — бэк добавляет owner автоматически
            'channel',
            input.title,
            // description и avatar: бэк не принимает при создании
        );

        if (!res.success || !res.body?.id) {
            return { success: false, status: res.status };
        }

        const channelId = res.body.id.toString();

        this.extraData.set(channelId, {
            description: input.description ?? '',
            inviteUrl: this.generateInviteUrl(channelId),
        });

        return { success: true, channelId, status: res.status };
    }

    async getChannel(channelId: string, myId: number): Promise<ChannelDetail | null> {
        const chatDetail = await chatService.getChatDetail(channelId);
        if (!chatDetail || chatDetail.type !== 'channel') return null;

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

        const extra = this.extraData.get(channelId) ?? {
            description: '',
            inviteUrl: this.generateInviteUrl(channelId),
        };

        return {
            id: channelId,
            title: chatDetail.title,
            avatarUrl: chatDetail.avatarUrl,
            description: extra.description,
            inviteUrl: extra.inviteUrl,
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
            const existing = this.extraData.get(channelId);
            this.extraData.set(channelId, {
                description: input.description,
                inviteUrl: existing?.inviteUrl ?? this.generateInviteUrl(channelId),
            });
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
        if (res.success) {
            this.extraData.delete(channelId);
        }
        return { success: res.success, errorCode: res.errorCode };
    }

    async removeMember(channelId: string, userId: number): Promise<{ success: boolean }> {
        const res = await chatService.removeMember(channelId, userId);
        return { success: res.success };
    }
}

export const channelService = new ChannelService();
