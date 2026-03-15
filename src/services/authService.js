// const BASE_URL = "http://pulseapp.space:8080/api/v1/auth";
const BASE_URL = "http://0.0.0.0:8080";
/**
 * Сервис авторизации. Обеспечивает логин, регистрацию, логаут
 * и проверку текущей сессии через REST API.
 */
class AuthService {
    /**
     * Проверяет, авторизован ли пользователь (по наличию cookie-сессии).
     * @returns {Promise<boolean>} `true`, если пользователь авторизован.
     */
    async checkAuth() {
        try {
            const response = await fetch(`${BASE_URL}/api/v1/chats`,
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );
            return response.ok;
        } catch {
            return false;
        }
    };

    /**
     * Отправляет POST-запрос к API авторизации.
     * @param {string} endpoint - Эндпоинт ('login', 'register', 'logout').
     * @param {object} data - Тело запроса.
     * @returns {Promise<{success: boolean, data?: object, error?: string}>} Результат запроса.
     * @private
     */
    async sendRequest(endpoint, data) {
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
                        errorMessage = errorData.errors.map(e => e.message).join('; ');

                    } else if (errorData.message){
                        errorMessage = errorData.message;
                    }
                } catch (jsonError) {
                    return {success: false, error : `Сервер вернул ошибку ${response.status}, данные не в JSON`};
                }

                return { success: false, error: errorMessage};
            }

            const result = await response.json();
            return { success: true, data: result };

        } catch (error) {
            return { success: false, error: error.message || 'Неизвестная ошибка сети' };
        }
    }

    /**
     * Выполняет вход пользователя.
     * @param {string} login - Логин.
     * @param {string} password - Пароль.
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async login(login, password) {
        return this.sendRequest('login', { login, password });
    }

    /**
     * Регистрирует нового пользователя.
     * @param {string} email - Электронная почта.
     * @param {string} login - Логин.
     * @param {string} password - Пароль.
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async register(email, login, password) {
        return this.sendRequest('register', { email, login, password });
    }

    /**
     * Выполняет выход из аккаунта.
     * @returns {Promise<{success: boolean, data?: object, error?: string}>}
     */
    async logout() {
        return this.sendRequest('logout', {});
    }
}

export const authService = new AuthService(); 
