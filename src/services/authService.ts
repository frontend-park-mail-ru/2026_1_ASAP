// const BASE_URL = "http://pulseapp.space:8080";
const BASE_URL = 'http://0.0.0.0:8080';


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
 * Сервис авторизации. Обеспечивает логин, регистрацию, логаут
 * и проверку текущей сессии через REST API.
 */
class AuthService {
    /**
     * Проверяет, авторизован ли пользователь (по наличию cookie-сессии).
     * @returns {Promise<boolean>} `true`, если пользователь авторизован.
     */
    public async checkAuth(): Promise<boolean> {
        try {
            const response = await fetch(`${BASE_URL}/api/v1/chats`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );
            return response.ok;
        } catch (error) {
            console.error("AuthService.checkAuth error:", error);
            return false;
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
            const response = await fetch(`${BASE_URL}/api/v1/auth/${endpoint}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                let errorMessage = `Ошибка сервера: ${response.status}`;

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
        return this.sendRequest('login', { login, password });
    }

    /**
     * Регистрирует нового пользователя.
     * @param {string} email - Электронная почта.
     * @param {string} login - Логин.
     * @param {string} password - Пароль.
     * @returns {Promise<AuthResult>}
     */
    public async register(email: string, login: string, password: string): Promise<AuthResult> {
        return this.sendRequest('register', { email, login, password });
    }

    /**
     * Выполняет выход из аккаунта.
     * @returns {Promise<AuthResult>}
     */
    public async logout(): Promise<AuthResult> {
        return this.sendRequest('logout', {});
    }
}

export const authService = new AuthService();
