import { httpClient } from "../core/utils/httpClient";
import { contactService } from "./contactService";

const host = window.location.hostname;
const BASE_URL = `${window.location.protocol}//${host}`;

/**
 * @interface AuthResult - Результат операции аутентификации.
 * @property {boolean} success - true, если операция успешна.
 * @property {object} [data] - Дополнительные данные, если операция успешна.
 * @property {string} [error] - Сообщение об ошибке, если операция неуспешна.
 */
interface AuthResult {
    success: boolean;
    data?: object;
    error?: string;
}

/**
 * @class AuthService
 * @description Сервис для взаимодействия с API аутентификации.
 * Предоставляет методы для входа, регистрации, выхода из системы и проверки текущей сессии пользователя.
 * Все методы возвращают стандартизированный объект `AuthResult`.
 */
class AuthService {
    public isAuthStatus: boolean | null = null;

    /**
     * Проверяет, авторизован ли текущий пользователь.
     * Делает запрос к защищенному эндпоинту (`/api/v1/chats`) и проверяет успешность ответа.
     * Наличие валидной сессионной cookie определяет результат.
     * @returns {Promise<boolean>} Возвращает `true`, если пользователь авторизован, иначе `false`.
     * @example
     * const isLoggedIn = await authService.checkAuth();
     * if (isLoggedIn) {
     *   console.log("Пользователь в системе.");
     * } else {
     *   console.log("Пользователь не авторизован.");
     * }
     */
    public async checkAuth(): Promise<boolean> {
        if (this.isAuthStatus !== null) {
            return this.isAuthStatus;
        }

        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats`,
                {
                    method: 'GET',
                    ignoreUnauthorized: true
                }
            );
            this.isAuthStatus = response.ok;
            return this.isAuthStatus;
        } catch (error) {
            console.error("AuthService.checkAuth error:", error);
            return this.isAuthStatus ?? true;
        }
    }

    /**
     * Отправляет POST-запрос к API авторизации.
     * @param {string} endpoint - Эндпоинт ('login', 'register', 'logout').
     * @param {object} data - Тело запроса.
     * @returns {Promise<AuthResult>} Результат запроса.
     * @private
     */
    private async sendRequest(endpoint: string, data: object): Promise<AuthResult> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/auth/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                ignoreUnauthorized: true
            });

            if (!response.ok) {
                let errorMessage = `Сервис временно недоступен (код ${response.status})`;

                try {
                    const errorData = await response.json();

                    if (errorData.errors && Array.isArray(errorData.errors)) {
                        errorMessage = errorData.errors.map((e: any) => e.message).join('; ');

                    } else if (errorData.message){
                        errorMessage = errorData.message;
                    }
                } catch (jsonError) {
                    return { success: false, error : `Сервер вернул ошибку ${response.status}, данные не в JSON` };
                }

                return { success: false, error: errorMessage };
            }

            const result = await response.json();
            return { success: true, data: result };

        } catch (error: any) {
            return { success: false, error: error.message || 'Неизвестная ошибка сети' };
        }
    }

    /**
     * Выполняет вход пользователя.
     * @param {string} login - Логин.
     * @param {string} password - Пароль.
     * @returns {Promise<AuthResult>}
     */
    public async login(login: string, password: string): Promise<AuthResult> {
        const result = await this.sendRequest('login', { login, password });
        if (result.success) {
            this.isAuthStatus = true;
        }
        contactService.clearCache();
        return result;
    }

    /**
     * Регистрирует нового пользователя.
     * @param {string} email - Электронная почта.
     * @param {string} login - Логин.
     * @param {string} password - Пароль.
     * @returns {Promise<AuthResult>}
     */
    public async register(email: string, login: string, password: string): Promise<AuthResult> {
        const result = await this.sendRequest('register', { email, login, password });
        if (result.success) {
            this.isAuthStatus = true;
        }
        contactService.clearCache();
        return result;
    }

    /**
     * Выполняет выход из аккаунта.
     * @returns {Promise<AuthResult>}
     */
    public async logout(): Promise<AuthResult> {
        const result = await this.sendRequest('logout', {});
        httpClient.clearToken();
        this.isAuthStatus = false;
        contactService.clearCache();
        return result;
    }
}

export const authService = new AuthService();
