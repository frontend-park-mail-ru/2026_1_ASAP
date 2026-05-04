import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supportService } from '../../../src/services/supportService';
import { authService } from '../../../src/services/authService';
import { mockFetchSequence, getFetchCall } from '../../factories/http';

beforeEach(() => {
    vi.spyOn(authService, 'checkAuth').mockResolvedValue(true);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('supportService.createComplaint', () => {
    it('authed → URL /complaints/create, FormData с payload', async () => {
        const fetchMock = mockFetchSequence([
            { status: 200, json: { status: 'success', body: { id: 1 } } },
        ]);
        const res = await supportService.createComplaint({
            type: 'bug',
            feedbackName: ' Alice ',
            feedbackEmail: ' a@b.ru ',
            body: 'Не работает кнопка',
        });
        expect(res.success).toBe(true);
        if (res.success) expect(res.data).toEqual({ id: 1 });

        const call = getFetchCall(fetchMock);
        expect(call.url).toContain('/api/v1/complaints/create');
        expect(call.method).toBe('POST');
    });

    it('не authed → URL /complaints/createUnauthorized', async () => {
        vi.spyOn(authService, 'checkAuth').mockResolvedValue(false);
        const fetchMock = mockFetchSequence([{ status: 200, json: {} }]);
        await supportService.createComplaint({
            type: 'bug',
            feedbackName: 'a',
            feedbackEmail: 'a@b.ru',
            body: 'x',
        });
        const call = getFetchCall(fetchMock);
        expect(call.url).toContain('/api/v1/complaints/createUnauthorized');
    });

    it('500 с errors → success=false, error из errors', async () => {
        mockFetchSequence([
            { status: 500, json: { errors: [{ message: 'Внутренняя ошибка' }] } },
        ]);
        const res = await supportService.createComplaint({
            type: 'bug',
            feedbackName: 'a',
            feedbackEmail: 'a@b.ru',
            body: 'x',
        });
        if (res.success) throw new Error('Должна была упасть');
        expect(res.error).toBe('Внутренняя ошибка');
        expect(res.status).toBe(500);
    });

    it('файл прикреплён — без ошибки', async () => {
        mockFetchSequence([{ status: 200, json: { status: 'success', body: { id: 2 } } }]);
        const file = new File(['data'], 'screenshot.png', { type: 'image/png' });
        const res = await supportService.createComplaint({
            type: 'suggestion',
            feedbackName: 'a',
            feedbackEmail: 'a@b.ru',
            body: 'idea',
            file,
        });
        expect(res.success).toBe(true);
    });
});

describe('supportService.getMyComplaints (регрессия support-my-tab-empty)', () => {
    it('body — массив напрямую → complaints[]', async () => {
        const items = [
            {
                id: 1,
                type: 'bug',
                status: 'opened',
                feedback: { feedback_name: 'a', feedback_email: 'a@b.ru' },
                body: 'x',
                user_id: 7,
                created_at: '2026-05-01',
                updated_at: '2026-05-01',
            },
        ];
        mockFetchSequence([{ status: 200, json: { body: items } }]);
        const res = await supportService.getMyComplaints();
        if (!res.success) throw new Error('Должна вернуться success');
        expect(res.complaints).toHaveLength(1);
        expect(res.complaints[0].id).toBe(1);
    });

    it('body не массив → пустой массив (без падения)', async () => {
        mockFetchSequence([{ status: 200, json: { body: { complaints: [] } } }]);
        const res = await supportService.getMyComplaints();
        if (!res.success) throw new Error('Должна вернуться success');
        expect(res.complaints).toEqual([]);
    });

    it('non-ok ответ → success=false с error', async () => {
        mockFetchSequence([{ status: 401, json: { message: 'Unauthorized' } }]);
        const res = await supportService.getMyComplaints();
        if (res.success) throw new Error('Должна была упасть');
        expect(res.error).toBe('Unauthorized');
        expect(res.status).toBe(401);
    });

});

describe('supportService.getStatistics', () => {
    it('валидный body с count_status и count_type → нормализованная статистика', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    body: {
                        count_status: {
                            count_status_opened: 5,
                            count_status_in_work: 3,
                            count_status_closed: 10,
                        },
                        count_type: {
                            count_type_bug: 7,
                            count_type_upgrade: 2,
                            count_type_product: 1,
                        },
                    },
                },
            },
        ]);
        const res = await supportService.getStatistics();
        if (!res.success) throw new Error('expected success');
        expect(res.statistics.count_status.count_status_opened).toBe(5);
        expect(res.statistics.count_type.count_type_bug).toBe(7);
    });

    it('альтернативные ключи (count_status_new, count_type_suggestion) маппятся', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    body: {
                        count_status: { count_status_new: 4, count_status_in_progress: 2, count_status_closed: 0 },
                        count_type: {
                            count_type_bug: 1,
                            count_type_suggestion: 3,
                            count_type_complaint: 2,
                        },
                    },
                },
            },
        ]);
        const res = await supportService.getStatistics();
        if (!res.success) throw new Error('expected success');
        expect(res.statistics.count_status.count_status_opened).toBe(4);
        expect(res.statistics.count_status.count_status_in_work).toBe(2);
        expect(res.statistics.count_type.count_type_upgrade).toBe(3);
        expect(res.statistics.count_type.count_type_product).toBe(2);
    });

    it('строковые числа парсятся', async () => {
        mockFetchSequence([
            {
                status: 200,
                json: {
                    body: {
                        count_status: { count_status_opened: '7', count_status_in_work: '0', count_status_closed: '0' },
                        count_type: { count_type_bug: '0', count_type_upgrade: '0', count_type_product: '0' },
                    },
                },
            },
        ]);
        const res = await supportService.getStatistics();
        if (!res.success) throw new Error('expected success');
        expect(res.statistics.count_status.count_status_opened).toBe(7);
    });

    it('некорректный body (без count_status) → success=false', async () => {
        mockFetchSequence([{ status: 200, json: { body: { foo: 'bar' } } }]);
        const res = await supportService.getStatistics();
        if (res.success) throw new Error('должна упасть');
        expect(res.error).toBe('Некорректный ответ сервера');
    });

    it('non-ok → error из errors[]', async () => {
        mockFetchSequence([{ status: 403, json: { errors: [{ message: 'Forbidden' }] } }]);
        const res = await supportService.getStatistics();
        if (res.success) throw new Error('должна упасть');
        expect(res.error).toBe('Forbidden');
        expect(res.status).toBe(403);
    });
});
