/**
 * @class HttpClient
 * @description Обеспечивает отправку HTTP-запросов с автоматической обработкой CSRF-токенов.
 */
export interface IRequestOptions extends RequestInit {
    ignoreUnauthorized?: boolean;
}
class HttpClient {
    private readonly tokenHeaderName = 'X-CSRF-Token';
    private readonly newTokenHeaderName = 'X-New-Csrf-Token';
    private readonly storageKey = 'csrf_token';

    /**
     * Очищает токен (вызывается при логауте)
     */
    public clearToken(): void {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * @description Получает CSRF-токен из localStorage.
     * @returns {string | null} CSRF-токен или null, если он отсутствует.
     * @private
     */
    private getToken(): string | null {
        return localStorage.getItem(this.storageKey);
    }

    /**
     * @description Сохраняет CSRF-токен в localStorage.
     * @param {string} token - CSRF-токен для сохранения.
     * @private
     */
    private setToken(token: string): void {
        localStorage.setItem(this.storageKey, token);
    }

    /**
     * Универсальный метод запроса, который оборачивает стандартный fetch
     * @param {string} url - URL для запроса.
     * @param {RequestInit} options - Опции запроса.
     * @returns {Promise<Response>} - Промис, который разрешается с ответом сервера.
     */
    public async request(url: string, options: IRequestOptions = {}): Promise<Response> {
        const headers = new Headers(options.headers || {});
        const currentToken = this.getToken();

        if (currentToken) {
            headers.set(this.tokenHeaderName, currentToken);
        }

        options.credentials = 'include';
        options.headers = headers;

        // первый запрос
        let response = await fetch(url, options);

        const newToken = response.headers.get(this.newTokenHeaderName);
        if (newToken) {
            this.setToken(newToken);
        }

        // если 403, то второй запрос
        if (response.status === 403 && newToken) {
            headers.set(this.tokenHeaderName, newToken);
            options.headers = headers;

            response = await fetch(url, options);

            const retryNewToken = response.headers.get(this.newTokenHeaderName);
            if (retryNewToken) {
                this.setToken(retryNewToken);
            }
        }

        if (response.status === 401 && !options.ignoreUnauthorized) {
            this.clearToken();
            window.dispatchEvent(new CustomEvent('unauthorized'));
        }

        return response;
    }
}

export const httpClient = new HttpClient();