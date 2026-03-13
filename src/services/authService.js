const API_BASE_URL = "http://pulseapp.space:8080/api/v1/auth";

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
            const response = await fetch('http://pulseapp.space:8080/api/v1/chats',
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
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
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
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    throw new Error(`Сервер вернул ошибку ${response.status}, данные не в JSON`);
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            return { success: true, data: result };

        } catch (error) {
            console.error(`Ошибка при запросе к ${endpoint}:`, error);
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
