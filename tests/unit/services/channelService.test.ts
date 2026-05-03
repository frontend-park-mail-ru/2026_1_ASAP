import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { channelService } from '../../../src/services/channelService';
import { chatService } from '../../../src/services/chatService';

beforeEach(() => {
    // очистка приватного extraData между тестами
    (channelService as any).extraData = new Map();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('channelService.createChannel', () => {
    it('успешное создание → success, channelId, extraData с description+inviteUrl', async () => {
        vi.spyOn(chatService, 'createChat').mockResolvedValue({
            success: true,
            status: 200,
            body: { id: 42 },
        });

        const res = await channelService.createChannel(
            { title: 'My Channel', description: 'desc' },
            7
        );

        expect(res.success).toBe(true);
        expect(res.channelId).toBe('42');
        expect(chatService.createChat).toHaveBeenCalledWith([], 'channel', 'My Channel');

        const extra = (channelService as any).extraData.get('42');
        expect(extra.description).toBe('desc');
        expect(extra.inviteUrl).toContain('/invite/42');
    });

    it('createChat вернул success=false → success=false', async () => {
        vi.spyOn(chatService, 'createChat').mockResolvedValue({
            success: false,
            status: 500,
        });

        const res = await channelService.createChannel({ title: 't' }, 7);
        expect(res.success).toBe(false);
        expect(res.status).toBe(500);
    });

    it('description undefined → пустая строка в extraData', async () => {
        vi.spyOn(chatService, 'createChat').mockResolvedValue({
            success: true,
            status: 200,
            body: { id: 1 },
        });
        await channelService.createChannel({ title: 't' }, 7);
        const extra = (channelService as any).extraData.get('1');
        expect(extra.description).toBe('');
    });
});

describe('channelService.getChannel', () => {
    it('chatDetail.type !== channel → null', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'group',
            title: 'g',
            unreadCount: 0,
        } as any);

        const res = await channelService.getChannel('5', 7);
        expect(res).toBeNull();
    });

    it('chatDetail отсутствует → null', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue(undefined);
        expect(await channelService.getChannel('5', 7)).toBeNull();
    });

    it('owner_id === myId → currentUserRole=owner', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'channel',
            title: 'news',
            unreadCount: 0,
            owner_id: 7,
            subscribersCount: 1,
        } as any);
        vi.spyOn(chatService, 'getChatMembers').mockResolvedValue([7]);
        vi.spyOn(chatService, 'getUserProfile').mockResolvedValue({
            id: 7,
            login: 'me',
            firstName: 'Me',
            lastName: '',
            avatarUrl: '',
        });

        const res = await channelService.getChannel('5', 7);
        expect(res?.currentUserRole).toBe('owner');
        expect(res?.ownerId).toBe(7);
        expect(res?.members).toHaveLength(1);
        expect(res?.members[0].isOwner).toBe(true);
    });

    it('owner_id !== myId → currentUserRole=participant', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'channel',
            title: 'news',
            unreadCount: 0,
            owner_id: 99,
        } as any);
        vi.spyOn(chatService, 'getChatMembers').mockResolvedValue([99, 7]);
        vi.spyOn(chatService, 'getUserProfile').mockImplementation(async (id: number) => ({
            id,
            login: `u${id}`,
            firstName: `U${id}`,
            lastName: '',
            avatarUrl: '',
        }));

        const res = await channelService.getChannel('5', 7);
        expect(res?.currentUserRole).toBe('participant');
        expect(res?.members.find((m) => m.id === 99)?.isOwner).toBe(true);
        expect(res?.members.find((m) => m.id === 7)?.isOwner).toBe(false);
    });

    it('owner_id отсутствует → participant (регрессия [bug] channel-owner-role-missing)', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'channel',
            title: 'news',
            unreadCount: 0,
        } as any);
        vi.spyOn(chatService, 'getChatMembers').mockResolvedValue([7]);
        vi.spyOn(chatService, 'getUserProfile').mockResolvedValue({
            id: 7, login: 'me', firstName: 'M', lastName: '', avatarUrl: '',
        });

        const res = await channelService.getChannel('5', 7);
        expect(res?.currentUserRole).toBe('participant');
        expect(res?.ownerId).toBe(0);
    });

    it('профиль null → исключается из members', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'channel',
            title: 'x',
            unreadCount: 0,
            owner_id: 7,
        } as any);
        vi.spyOn(chatService, 'getChatMembers').mockResolvedValue([7, 99]);
        vi.spyOn(chatService, 'getUserProfile').mockImplementation(async (id: number) =>
            id === 7 ? { id: 7, login: 'me', firstName: '', lastName: '', avatarUrl: '' } : null
        );

        const res = await channelService.getChannel('5', 7);
        expect(res?.members).toHaveLength(1);
        expect(res?.members[0].id).toBe(7);
    });
});

describe('channelService.updateChannel', () => {
    function setupAsOwner() {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'channel',
            title: 'old',
            unreadCount: 0,
            owner_id: 7,
        } as any);
        vi.spyOn(chatService, 'getChatMembers').mockResolvedValue([7]);
        vi.spyOn(chatService, 'getUserProfile').mockResolvedValue({
            id: 7, login: 'me', firstName: '', lastName: '', avatarUrl: '',
        });
    }

    function setupAsParticipant() {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue({
            id: '5',
            type: 'channel',
            title: 'old',
            unreadCount: 0,
            owner_id: 99,
        } as any);
        vi.spyOn(chatService, 'getChatMembers').mockResolvedValue([99, 7]);
        vi.spyOn(chatService, 'getUserProfile').mockImplementation(async (id: number) => ({
            id, login: `u${id}`, firstName: '', lastName: '', avatarUrl: '',
        }));
    }

    it('канал не найден → CHANNEL_NOT_FOUND', async () => {
        vi.spyOn(chatService, 'getChatDetail').mockResolvedValue(undefined);
        const res = await channelService.updateChannel('5', { title: 'x' }, 7);
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('CHANNEL_NOT_FOUND');
    });

    it('participant пытается изменить title → YOU_CANT_CHANGE_TITLE', async () => {
        setupAsParticipant();
        const res = await channelService.updateChannel('5', { title: 'new' }, 7);
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('YOU_CANT_CHANGE_TITLE');
    });

    it('participant пытается изменить avatar → YOU_CANT_CHANGE_AVATAR', async () => {
        setupAsParticipant();
        const fakeFile = new File([''], 'a.png');
        const res = await channelService.updateChannel('5', { avatar: fakeFile }, 7);
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('YOU_CANT_CHANGE_AVATAR');
    });

    it('owner меняет title → updateChatTitle вызван', async () => {
        setupAsOwner();
        const titleSpy = vi.spyOn(chatService, 'updateChatTitle').mockResolvedValue(true);
        const res = await channelService.updateChannel('5', { title: 'new' }, 7);
        expect(res.success).toBe(true);
        expect(titleSpy).toHaveBeenCalledWith('5', 'new');
    });

    it('description сохраняется в extraData без HTTP-вызова', async () => {
        setupAsOwner();
        const res = await channelService.updateChannel('5', { description: 'new desc' }, 7);
        expect(res.success).toBe(true);
        expect((channelService as any).extraData.get('5').description).toBe('new desc');
    });

    it('updateChatTitle вернул false → success=false', async () => {
        setupAsOwner();
        vi.spyOn(chatService, 'updateChatTitle').mockResolvedValue(false);
        const res = await channelService.updateChannel('5', { title: 'x' }, 7);
        expect(res.success).toBe(false);
    });
});

describe('channelService.leaveChannel', () => {
    it('вызывает chatService.leaveChat с числовым id', async () => {
        const spy = vi.spyOn(chatService, 'leaveChat').mockResolvedValue({ success: true, status: 200 });
        const res = await channelService.leaveChannel('42');
        expect(res.success).toBe(true);
        expect(spy).toHaveBeenCalledWith(42);
    });
});

describe('channelService.deleteChannel', () => {
    it('успешное удаление → extraData очищается', async () => {
        (channelService as any).extraData.set('42', { description: 'd', inviteUrl: 'u' });
        vi.spyOn(chatService, 'deleteChat').mockResolvedValue({ success: true, status: 200 });
        const res = await channelService.deleteChannel('42');
        expect(res.success).toBe(true);
        expect((channelService as any).extraData.has('42')).toBe(false);
    });

    it('неудача → extraData остаётся, errorCode пробрасывается', async () => {
        (channelService as any).extraData.set('42', { description: 'd', inviteUrl: 'u' });
        vi.spyOn(chatService, 'deleteChat').mockResolvedValue({
            success: false,
            status: 403,
            errorCode: 'NOT_OWNER',
        });
        const res = await channelService.deleteChannel('42');
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('NOT_OWNER');
        expect((channelService as any).extraData.has('42')).toBe(true);
    });
});

describe('channelService.removeMember', () => {
    it('делегирует chatService.removeMember', async () => {
        const spy = vi.spyOn(chatService, 'removeMember').mockResolvedValue({ success: true, status: 200 });
        const res = await channelService.removeMember('5', 11);
        expect(res.success).toBe(true);
        expect(spy).toHaveBeenCalledWith('5', 11);
    });
});

describe('channelService.joinChannel', () => {
    it('пока не реализован — возвращает success=false', async () => {
        const res = await channelService.joinChannel('token');
        expect(res.success).toBe(false);
    });
});
