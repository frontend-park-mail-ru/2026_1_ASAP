import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactService } from '../../../src/services/contactService';
import { mockFetchSequence, mockFetchRoutes, getFetchCall } from '../../factories/http';
import { makeBackendProfile } from '../../factories/profile';

let svc: ContactService;

beforeEach(() => {
    svc = new ContactService();
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('contactService.getContacts', () => {
    it('200 → массив FrontendContact', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    status: 'success',
                    body: [
                        { contact_user_id: 1, first_name: 'Alice', last_name: 'Smith', contact_avatar_url: '' },
                        { contact_user_id: 2, first_name: '', last_name: '', contact_avatar_url: '' },
                    ],
                },
            },
        ]);
        const contacts = await svc.getContacts();
        expect(contacts).toHaveLength(2);
        expect(contacts[0].contact_name).toBe('Alice Smith');
        expect(contacts[1].contact_name).toBe('User#2');
    });

    it('non-ok → []', async () => {
        mockFetchSequence([{ status: 500 }]);
        expect(await svc.getContacts()).toEqual([]);
    });
});

describe('contactService.getProfileInfo', () => {
    it('200 → FrontendProfile с правильным маппингом', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    status: 'success',
                    body: makeBackendProfile({
                        user_id: 7,
                        login: 'alice',
                        first_name: 'Alice',
                        last_name: 'Smith',
                        bio: 'hello',
                    }),
                },
            },
        ]);
        const p = await svc.getProfileInfo(7);
        expect(p.mainInfo.firstName).toBe('Alice');
        expect(p.mainInfo.lastName).toBe('Smith');
        expect(p.additionalInfo.id).toBe(7);
        expect(p.additionalInfo.bio).toBe('hello');
    });

    it('error → fallback profile с "Пользователь"', async () => {
        mockFetchSequence([{ status: 500 }]);
        const p = await svc.getProfileInfo(7);
        expect(p.mainInfo.firstName).toBe('Пользователь');
    });
});

describe('contactService.getMyProfile (SWR)', () => {
    it('первый вызов: fetch + saveToCache', async () => {
        const fetchMock = mockFetchSequence([
            { status: 200, json: { status: 'success', body: makeBackendProfile({ user_id: 1, login: 'me' }) } },
        ]);
        const p = await svc.getMyProfile();
        expect(p.additionalInfo.login).toBe('me');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('current_user_profile')).toBeTruthy();
    });

    it('повторный вызов через инстанс: возвращает кэш в памяти, без fetch', async () => {
        mockFetchSequence([
            { status: 200, json: { status: 'success', body: makeBackendProfile({ user_id: 1 }) } },
        ]);
        await svc.getMyProfile();

        // во второй раз — fetch не должен вызываться
        const fetchMock2 = mockFetchSequence([]);
        await svc.getMyProfile();
        expect(fetchMock2).toHaveBeenCalledTimes(0);
    });

    it('clearCache: следующий вызов снова идёт в сеть', async () => {
        mockFetchSequence([
            { status: 200, json: { status: 'success', body: makeBackendProfile({ user_id: 1 }) } },
        ]);
        await svc.getMyProfile();
        svc.clearCache();
        const fetchMock = mockFetchSequence([
            { status: 200, json: { status: 'success', body: makeBackendProfile({ user_id: 1 }) } },
        ]);
        await svc.getMyProfile();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});

describe('contactService.addContact', () => {
    it('200 → success', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const res = await svc.addContact('alice', 5);
        expect(res.success).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('POST');
        expect(call.url).toContain('/api/v1/contacts');
        expect(call.body).toEqual({ contact_user_id: 5, first_name: 'alice', last_name: '' });
    });

    it('400 с errors → code заполнен', async () => {
        mockFetchSequence([
            { status: 400, json: { errors: [{ code: 'ALREADY_ADDED' }] } },
        ]);
        const res = await svc.addContact('alice', 5);
        expect(res.success).toBe(false);
        expect(res.code).toBe('ALREADY_ADDED');
    });

});

describe('contactService.deleteContact', () => {
    it('DELETE с правильным URL', async () => {
        const fetchMock = mockFetchSequence([{ status: 200 }]);
        const res = await svc.deleteContact(5);
        expect(res.success).toBe(true);
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('DELETE');
        expect(call.url).toContain('/api/v1/contacts/5');
    });
});

describe('contactService.getIdByLogin', () => {
    it('200 → id из body.user_id', async () => {
        mockFetchSequence([
            { status: 200, json: { status: 'success', body: makeBackendProfile({ user_id: 42 }) } },
        ]);
        const r = await svc.getIdByLogin('alice');
        expect(r.id).toBe(42);
        expect(r.status).toBe(200);
    });

    it('404 → id=null, status=404', async () => {
        mockFetchSequence([{ status: 404 }]);
        const r = await svc.getIdByLogin('ghost');
        expect(r.id).toBeNull();
        expect(r.status).toBe(404);
    });

});

describe('contactService.deleteAvatar', () => {
    it('200 → status=200, profile=обновлённый', async () => {
        mockFetchSequence([
            { status: 200, json: { status: 'success', body: makeBackendProfile({ user_id: 1 }) } },
        ]);
        const r = await svc.deleteAvatar();
        expect(r.status).toBe(200);
        expect(r.profile).not.toBeNull();
    });

    it('404 → profile=null', async () => {
        mockFetchSequence([{ status: 404 }]);
        const r = await svc.deleteAvatar();
        expect(r.status).toBe(404);
        expect(r.profile).toBeNull();
    });
});

describe('contactService.isAdmin (регрессия admin-route-alice-access)', () => {
    it('профиль не "admin" → false, без запроса к complaints/all', async () => {
        const fetchMock = mockFetchRoutes([
            {
                match: '/profiles/me',
                response: {
                    status: 200,
                    json: { status: 'success', body: makeBackendProfile({ login: 'alice' }) },
                },
            },
        ]);
        const r = await svc.isAdmin();
        expect(r).toBe(false);
        // только один запрос — за профилем
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('login="admin" + 200 ok на complaints/all → true', async () => {
        mockFetchRoutes([
            {
                match: '/profiles/me',
                response: {
                    status: 200,
                    json: { status: 'success', body: makeBackendProfile({ login: 'admin' }) },
                },
            },
            {
                match: '/complaints/all',
                response: { status: 200, json: { body: { complaints: [] } } },
            },
        ]);
        const r = await svc.isAdmin();
        expect(r).toBe(true);
    });

    it('login="admin" + 403 на complaints/all → false', async () => {
        mockFetchRoutes([
            {
                match: '/profiles/me',
                response: {
                    status: 200,
                    json: { status: 'success', body: makeBackendProfile({ login: 'admin' }) },
                },
            },
            { match: '/complaints/all', response: { status: 403 } },
        ]);
        const r = await svc.isAdmin();
        expect(r).toBe(false);
    });

    it('кэширует результат — повторный вызов не делает запросов', async () => {
        const fetchMock = mockFetchRoutes([
            {
                match: '/profiles/me',
                response: {
                    status: 200,
                    json: { status: 'success', body: makeBackendProfile({ login: 'alice' }) },
                },
            },
        ]);
        await svc.isAdmin();
        await svc.isAdmin();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
