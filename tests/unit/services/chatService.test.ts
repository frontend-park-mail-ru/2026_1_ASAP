import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatService } from '../../../src/services/chatService';
import { mockFetchSequence, mockFetchRoutes, getFetchCall } from '../../factories/http';

let svc: ChatService;

beforeEach(() => {
    svc = new ChatService();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('chatService.getChats', () => {
    it('200 success → массив чатов', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    status: 'success',
                    body: [
                        { id: 1, type: 'dialog', title: 'bob', avatar: '' },
                        { id: 2, type: 'group', title: 'team', avatar: '' },
                    ],
                },
            },
        ]);

        const chats = await svc.getChats(7);
        expect(chats).toHaveLength(2);
        expect(chats[0].type).toBe('dialog');
        expect(chats[1].type).toBe('group');
    });

    it('non-ok ответ → пустой массив', async () => {
        mockFetchSequence([{ status: 500 }]);
        const chats = await svc.getChats(7);
        expect(chats).toEqual([]);
    });

    it('status !== success → пустой массив', async () => {
        mockFetchSequence([{ status: 200, json: { status: 'error', body: null } }]);
        const chats = await svc.getChats(7);
        expect(chats).toEqual([]);
    });
});

describe('chatService.getChatDetail', () => {
    it('200 success channel → ChatDetail', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    status: 'success',
                    body: {
                        id: 10,
                        type: 'channel',
                        title: 'news',
                        avatar: '',
                        owner_id: 7,
                        subscribers_count: 42,
                    },
                },
            },
        ]);
        const chat = (await svc.getChatDetail('10')) as any;
        expect(chat).toBeDefined();
        expect(chat.id).toBe('10');
        expect(chat.type).toBe('channel');
        expect(chat.subscribersCount).toBe(42);
        expect(chat.owner_id).toBe(7);
    });

    it('неизвестный тип чата → undefined', async () => {
        mockFetchSequence([
            { status: 200, json: { status: 'success', body: { id: 1, type: 'unknown', title: 'x' } } },
        ]);
        const chat = await svc.getChatDetail('1');
        expect(chat).toBeUndefined();
    });

    it('404 → undefined', async () => {
        mockFetchSequence([{ status: 404 }]);
        const chat = await svc.getChatDetail('999');
        expect(chat).toBeUndefined();
    });
});

describe('chatService.createChat', () => {
    it('POST с корректным payload для группы', async () => {
        const fetchMock = mockFetchSequence([
            { status: 200, json: { status: 'success', body: { id: 99 } } },
        ]);
        const res = await svc.createChat([1, 2, 3], 'group', 'team');
        expect(res.success).toBe(true);
        expect(res.body.id).toBe(99);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('POST');
        expect(call.url).toContain('/api/v1/chats');
        expect(call.body).toEqual({ members_id: [1, 2, 3], title: 'team', type: 'group' });
    });

    it('canal без title → передаёт undefined', async () => {
        const fetchMock = mockFetchSequence([
            { status: 200, json: { status: 'success', body: { id: 100 } } },
        ]);
        await svc.createChat([], 'channel', 'mychannel');
        const call = getFetchCall(fetchMock);
        expect(call.body.type).toBe('channel');
        expect(call.body.title).toBe('mychannel');
    });

    it('409 dialog уже существует → success=false, status=409, body=данные', async () => {
        mockFetchSequence([{ status: 409, json: { status: 'success', body: { id: 5 } } }]);
        const res = await svc.createChat([2], 'dialog');
        expect(res.success).toBe(false);
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ id: 5 });
    });
});

describe('chatService.deleteChat', () => {
    it('200 → success=true', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const res = await svc.deleteChat('5');
        expect(res.success).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('DELETE');
        expect(call.url).toContain('/api/v1/chats/5');
    });

    it('403 с errors → errorCode заполнен', async () => {
        mockFetchSequence([{ status: 403, json: { status: 'error', errors: [{ code: 'NOT_OWNER' }] } }]);
        const res = await svc.deleteChat('5');
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('NOT_OWNER');
    });
});

describe('chatService.leaveChat', () => {
    it('DELETE на /api/v1/chats/{id}/quit, 200 → success', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const res = await svc.leaveChat(7);
        expect(res.success).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('DELETE');
        expect(call.url).toContain('/api/v1/chats/7/quit');
    });

    it('403 с errors → errorCode и errorMessage', async () => {
        mockFetchSequence([
            {
                status: 403,
                json: {
                    status: 'error',
                    errors: [{ code: 'NOT_MEMBER', message: 'Вы не участник' }],
                },
            },
        ]);
        const res = await svc.leaveChat(7);
        expect(res.errorCode).toBe('NOT_MEMBER');
        expect(res.errorMessage).toBe('Вы не участник');
    });

});

describe('chatService.updateChatTitle', () => {
    it('200 → true; payload содержит title', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const ok = await svc.updateChatTitle('5', 'New Title');
        expect(ok).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('POST');
        expect(call.url).toContain('/api/v1/chats/5/title');
        expect(call.body).toEqual({ title: 'New Title' });
    });

    it('500 → false', async () => {
        mockFetchSequence([{ status: 500 }]);
        expect(await svc.updateChatTitle('5', 'x')).toBe(false);
    });
});

describe('chatService.addMembersToChat', () => {
    it('200 → success; payload members_id', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const res = await svc.addMembersToChat('5', [10, 11]);
        expect(res.success).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.url).toContain('/api/v1/chats/5/members');
        expect(call.body).toEqual({ members_id: [10, 11] });
    });

    it('400 с errors → errorCode заполнен', async () => {
        mockFetchSequence([
            { status: 400, json: { status: 'error', errors: [{ code: 'BAD_REQUEST' }] } },
        ]);
        const res = await svc.addMembersToChat('5', [10]);
        expect(res.success).toBe(false);
        expect(res.errorCode).toBe('BAD_REQUEST');
    });
});

describe('chatService.getChatMembers', () => {
    it('200 → массив members_id', async () => {
        mockFetchSequence([
            { status: 200, json: { status: 'success', body: { members_id: [1, 2, 3] } } },
        ]);
        const ids = await svc.getChatMembers('5');
        expect(ids).toEqual([1, 2, 3]);
    });

    it('non-ok → []', async () => {
        mockFetchSequence([{ status: 500 }]);
        expect(await svc.getChatMembers('5')).toEqual([]);
    });
});

describe('chatService.removeMember', () => {
    it('DELETE на /chats/{id}/members/{userId}', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const res = await svc.removeMember('5', 11);
        expect(res.success).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('DELETE');
        expect(call.url).toContain('/api/v1/chats/5/members/11');
    });
});

describe('chatService.findExistingDialogChatId', () => {
    it('возвращает id существующего диалога по логину', async () => {
        mockFetchRoutes([
            {
                match: '/api/v1/chats',
                method: 'GET',
                response: {
                    status: 200,
                    json: {
                        status: 'success',
                        body: [
                            { id: 1, type: 'dialog', title: 'bob', avatar: '' },
                            { id: 2, type: 'dialog', title: 'carol', avatar: '' },
                        ],
                    },
                },
            },
        ]);
        const id = await svc.findExistingDialogChatId(99, 'carol');
        expect(id).toBe('2');
    });
});

describe('chatService.getUserProfile', () => {
    it('кэширует результат и не делает повторный fetch', async () => {
        const fetchMock = mockFetchSequence([
            {
                status: 200,
                json: {
                    status: 'success',
                    body: { user_id: 11, login: 'bob', first_name: 'Bob', avatar: '' },
                },
            },
        ]);
        const a = await svc.getUserProfile(11);
        const b = await svc.getUserProfile(11);
        expect(a).toEqual(b);
        expect(a?.login).toBe('bob');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('non-ok → null', async () => {
        mockFetchSequence([{ status: 404 }]);
        expect(await svc.getUserProfile(99)).toBeNull();
    });
});
