import { chatService } from './chatService';
import { contactService } from './contactService';
import { ChannelChat } from '../types/chat';

export type ChannelRole = 'owner' | 'participant';

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
    // TODO: нет бэкенд-эндпоинта, пока замокано
    description: string;
    // TODO: нет бэкенд-эндпоинта, пока замокано
    inviteUrl: string;
    members: ChannelMember[];
    // TODO: уточнить у бэкенда, возвращает ли поле subscribers_count корректно (сейчас fallback на members.length)
    subscribersCount: number;
    currentUserRole: ChannelRole;
    ownerId: number;
}

export interface CreateChannelInput {
    title: string;
    description?: string;
    avatar?: File;
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

interface MockChannelData extends ChannelExtraData {
    id: string;
    title: string;
    avatarUrl?: string;
    ownerId: number;
    members: ChannelMember[];
}

class ChannelService {
    private mockData: Map<string, MockChannelData> = new Map();
    private extraData: Map<string, ChannelExtraData> = new Map();

    private generateInviteUrl(channelId: string): string {
        // TODO: заменить на реальный эндпоинт приглашений, когда появится на бэкенде
        return `https://pulseapp.space/invite/${channelId}`;
    }

    async createChannel(
        input: CreateChannelInput,
        myId: number
    ): Promise<{ success: boolean; channelId?: string; errorCode?: string; status?: number }> {
        const channelId = Date.now().toString();
        const profile = await contactService.getMyProfile().catch(() => null);
        const displayName = profile
            ? [profile.mainInfo.firstName, profile.mainInfo.lastName].filter(Boolean).join(' ')
                || profile.additionalInfo.login
            : 'Вы';

        this.mockData.set(channelId, {
            id: channelId,
            title: input.title,
            avatarUrl: input.avatar ? URL.createObjectURL(input.avatar) : undefined,
            description: input.description || '',
            inviteUrl: this.generateInviteUrl(channelId),
            ownerId: myId,
            members: [{
                id: myId,
                name: displayName,
                avatarUrl: profile?.mainInfo.avatarUrl,
                isOwner: true,
            }],
        });

        return { success: true, channelId };
    }

    isMockChannel(channelId: string): boolean {
        return this.mockData.has(channelId);
    }

    getMockChannelChat(channelId: string): ChannelChat | null {
        const mock = this.mockData.get(channelId);
        if (!mock) return null;

        return {
            id: mock.id,
            title: mock.title,
            type: 'channel',
            avatarUrl: mock.avatarUrl,
            unreadCount: 0,
            subscribersCount: mock.members.length,
            description: mock.description,
            owner_id: mock.ownerId,
            currentUserRole: 'owner',
        };
    }

    /**
     * Возвращает полную информацию о канале включая роль текущего пользователя.
     * Обогащает данные chatService mock-данными (description, inviteUrl).
     */
    async getChannel(channelId: string, myId: number): Promise<ChannelDetail | null> {
        const mock = this.mockData.get(channelId);
        if (mock) {
            return {
                id: mock.id,
                title: mock.title,
                avatarUrl: mock.avatarUrl,
                description: mock.description,
                inviteUrl: mock.inviteUrl,
                members: mock.members,
                subscribersCount: mock.members.length,
                currentUserRole: mock.ownerId === myId ? 'owner' : 'participant',
                ownerId: mock.ownerId,
            };
        }

        const chatDetail = await chatService.getChatDetail(channelId);
        if (!chatDetail || chatDetail.type !== 'channel') return null;

        const ownerId: number = (chatDetail as any).owner_id || 0;
        const currentUserRole: ChannelRole = ownerId !== 0 && ownerId === myId ? 'owner' : 'participant';

        const memberIds = await chatService.getChatMembers(channelId);

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
            // TODO: subscribersCount — fallback на members.length, пока бэк не возвращает достоверное значение
            subscribersCount: (chatDetail as any).subscribersCount || memberIds.length,
            currentUserRole,
            ownerId,
        };
    }

    /**
     * Обновляет параметры канала.
     * Ограничения прав (YOU_CANT_CHANGE_TITLE / YOU_CANT_CHANGE_AVATAR) эмулируются mock-ом,
     * реальный бэкенд тоже их проверяет (HTTP 403).
     */
    async updateChannel(
        channelId: string,
        input: UpdateChannelInput,
        myId: number
    ): Promise<{ success: boolean; errorCode?: string }> {
        const mock = this.mockData.get(channelId);
        if (mock) {
            if (mock.ownerId !== myId) {
                if (input.title !== undefined) return { success: false, errorCode: 'YOU_CANT_CHANGE_TITLE' };
                if (input.avatar !== undefined) return { success: false, errorCode: 'YOU_CANT_CHANGE_AVATAR' };
            }

            if (input.title !== undefined) mock.title = input.title;
            if (input.description !== undefined) mock.description = input.description;
            if (input.avatar) {
                if (mock.avatarUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(mock.avatarUrl);
                }
                mock.avatarUrl = URL.createObjectURL(input.avatar);
            }

            return { success: true };
        }

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

    /** TODO: нет ручки для вступления по инвайт-ссылке */
    async joinChannel(_inviteToken: string): Promise<{ success: boolean; channelId?: string }> {
        return { success: false };
    }

    async leaveChannel(channelId: string): Promise<{ success: boolean }> {
        if (this.mockData.has(channelId)) {
            this.mockData.delete(channelId);
            return { success: true };
        }

        const res = await chatService.leaveChat(Number(channelId));
        return { success: res.success };
    }

    async deleteChannel(channelId: string): Promise<{ success: boolean; errorCode?: string }> {
        const mock = this.mockData.get(channelId);
        if (mock) {
            if (mock.avatarUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(mock.avatarUrl);
            }
            this.mockData.delete(channelId);
            return { success: true };
        }

        const res = await chatService.deleteChat(channelId);
        if (res.success) {
            this.mockData.delete(channelId);
            this.extraData.delete(channelId);
        }
        return { success: res.success, errorCode: res.errorCode };
    }

    async removeMember(channelId: string, userId: number): Promise<{ success: boolean }> {
        const mock = this.mockData.get(channelId);
        if (mock) {
            mock.members = mock.members.filter(member => member.id !== userId || member.isOwner);
            return { success: true };
        }

        const res = await chatService.removeMember(channelId, userId);
        return { success: res.success };
    }
}

export const channelService = new ChannelService();
