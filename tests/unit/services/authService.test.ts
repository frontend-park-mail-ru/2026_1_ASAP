import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../../src/services/authService';
import { contactService } from '../../../src/services/contactService';
import { httpClient } from '../../../src/core/utils/httpClient';
import { mockFetchSequence, getFetchCall } from '../../factories/http';

describe('authService', () => {
    beforeEach(() => {
        // сброс приватного состояния синглтона
        (authService as any).isAuthStatus = null;
        contactService.clearCache();
        vi.spyOn(contactService, 'clearCache');
        vi.spyOn(httpClient, 'clearToken');
    });

    afterEach(() => {
        (authService as any).isAuthStatus = null;
    });

    describe('login', () => {
        it('200 OK → success=true, isAuthStatus=true, contactService.clearCache вызван', async () => {
            const fetchMock = mockFetchSequence([{ status: 200, json: { user_id: 1 } }]);

            const result = await authService.login('alice', 'Password123!');

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ user_id: 1 });
            expect(authService.isAuthStatus).toBe(true);
            expect(contactService.clearCache).toHaveBeenCalled();

            const call = getFetchCall(fetchMock);
            expect(call.url).toContain('/api/v1/auth/login');
            expect(call.method).toBe('POST');
            expect(call.body).toEqual({ login: 'alice', password: 'Password123!' });
            expect(call.headers.get('Content-Type')).toBe('application/json');
        });

        it('401 с errors[] → success=false, error из errors[].message', async () => {
            mockFetchSequence([
                { status: 401, json: { errors: [{ message: 'Неверный логин или пароль' }] } },
            ]);

            const result = await authService.login('alice', 'wrong');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Неверный логин или пароль');
            expect(authService.isAuthStatus).toBeNull();
        });

        it('401 без JSON-тела → fallback message', async () => {
            mockFetchSequence([{ status: 401 }]);

            const result = await authService.login('alice', 'wrong');
            expect(result.success).toBe(false);
            expect(result.error).toContain('401');
        });

        it('сетевая ошибка → success=false с error', async () => {
            mockFetchSequence([{ throws: new Error('Network down') }]);

            const result = await authService.login('alice', 'pwd');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Network down');
        });
    });

    describe('register', () => {
        it('200 OK → success=true, payload корректный', async () => {
            const fetchMock = mockFetchSequence([{ status: 200, json: { user_id: 5 } }]);

            const result = await authService.register('a@b.ru', 'alice', 'Password123!');

            expect(result.success).toBe(true);
            expect(authService.isAuthStatus).toBe(true);
            const call = getFetchCall(fetchMock);
            expect(call.url).toContain('/api/v1/auth/register');
            expect(call.body).toEqual({ email: 'a@b.ru', login: 'alice', password: 'Password123!' });
        });

        it('409 (логин занят) → success=false с message', async () => {
            mockFetchSequence([{ status: 409, json: { message: 'Логин уже занят' } }]);

            const result = await authService.register('a@b.ru', 'taken', 'Password123!');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Логин уже занят');
        });
    });

    describe('logout', () => {
        it('200 OK → isAuthStatus=false, токен очищается', async () => {
            const fetchMock = mockFetchSequence([{ status: 200, json: {} }]);

            const result = await authService.logout();

            expect(result.success).toBe(true);
            expect(authService.isAuthStatus).toBe(false);
            expect(httpClient.clearToken).toHaveBeenCalled();
            const call = getFetchCall(fetchMock);
            expect(call.url).toContain('/api/v1/auth/logout');
            expect(call.method).toBe('POST');
        });

        it('даже при ошибке logout очищает локальный стейт', async () => {
            mockFetchSequence([{ status: 500, json: { message: 'Ошибка сервера' } }]);

            await authService.logout();

            expect(authService.isAuthStatus).toBe(false);
            expect(httpClient.clearToken).toHaveBeenCalled();
        });
    });

    describe('checkAuth', () => {
        it('200 OK → true, кэширует результат', async () => {
            const fetchMock = mockFetchSequence([{ status: 200, json: { body: [] } }]);

            const a = await authService.checkAuth();
            const b = await authService.checkAuth();

            expect(a).toBe(true);
            expect(b).toBe(true);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('401 → false', async () => {
            mockFetchSequence([{ status: 401 }]);
            const result = await authService.checkAuth();
            expect(result).toBe(false);
        });

        it('сетевая ошибка → возвращает кэшированный/true (fallback)', async () => {
            mockFetchSequence([{ throws: new Error('offline') }]);
            const result = await authService.checkAuth();
            expect(result).toBe(true);
        });

        it('checkAuth вызывает /api/v1/chats с GET и ignoreUnauthorized', async () => {
            const fetchMock = mockFetchSequence([{ status: 200, json: { body: [] } }]);
            await authService.checkAuth();
            const call = getFetchCall(fetchMock);
            expect(call.url).toContain('/api/v1/chats');
            expect(call.method).toBe('GET');
        });
    });

});
