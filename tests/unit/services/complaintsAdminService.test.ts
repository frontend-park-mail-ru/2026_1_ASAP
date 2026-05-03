import { afterEach, describe, expect, it, vi } from 'vitest';
import { complaintsAdminService } from '../../../src/services/complaintsAdminService';
import { mockFetchSequence, getFetchCall } from '../../factories/http';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('complaintsAdminService.getAllComplaints', () => {
    it('200 → массив из body.complaints', async () => {
        const items = [
            { id: 1, type: 'bug', status: 'new', body: 'x', created_at: '2026-05-01', updated_at: '2026-05-01' },
            { id: 2, type: 'idea', status: 'closed', body: 'y', created_at: '2026-05-02', updated_at: '2026-05-02' },
        ];
        const fetchMock = mockFetchSequence([{ status: 200, json: { body: { complaints: items } } }]);
        const list = await complaintsAdminService.getAllComplaints();
        expect(list).toHaveLength(2);
        const call = getFetchCall(fetchMock);
        expect(call.url).toContain('/api/v1/complaints/all');
    });

    it('body.complaints отсутствует → []', async () => {
        mockFetchSequence([{ status: 200, json: { body: {} } }]);
        const list = await complaintsAdminService.getAllComplaints();
        expect(list).toEqual([]);
    });

    it('non-ok → throw', async () => {
        mockFetchSequence([{ status: 403 }]);
        await expect(complaintsAdminService.getAllComplaints()).rejects.toThrow(/403/);
    });
});

describe('complaintsAdminService.updateStatus', () => {
    it('200 → resolves; payload содержит complaint_id и status', async () => {
        const fetchMock = mockFetchSequence([{ status: 200, json: {} }]);
        await expect(complaintsAdminService.updateStatus(7, 'closed')).resolves.toBeUndefined();
        const call = getFetchCall(fetchMock);
        expect(call.method).toBe('POST');
        expect(call.url).toContain('/api/v1/complaints/update');
        expect(call.body).toEqual({ complaint_id: 7, status: 'closed' });
    });

    it('non-ok с errors[] → throw с собранными message', async () => {
        mockFetchSequence([
            { status: 400, json: { errors: [{ message: 'Bad status' }, { message: 'Bad id' }] } },
        ]);
        await expect(complaintsAdminService.updateStatus(7, 'invalid')).rejects.toThrow(/Bad status; Bad id/);
    });

    it('non-ok с message → throw c message', async () => {
        mockFetchSequence([{ status: 500, json: { message: 'Internal' } }]);
        await expect(complaintsAdminService.updateStatus(7, 'closed')).rejects.toThrow('Internal');
    });

    it('non-ok без JSON → throw с дефолтным сообщением', async () => {
        mockFetchSequence([{ status: 502 }]);
        await expect(complaintsAdminService.updateStatus(7, 'closed')).rejects.toThrow(/502/);
    });
});
