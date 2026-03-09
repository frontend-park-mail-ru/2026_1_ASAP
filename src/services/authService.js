const API_BASE_URL = "http://0.0.0.0:8080/api/v1/auth";

class AuthService {
    async getMe() {
        return {
            id: 1,
            name: 'Alex',
            email: 'alex@mail.ru'
        };
    }
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
            console.log(`Ответ от ${endpoint}:`, response);
            if (!response.ok) {
                let errorMessage = `Ошибка сервера: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    console.warn(`Сервер вернул ошибку ${response.status}, но тело ответа не JSON.`);
                    console.log('Ответ сервера:', jsonError);
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log(`Данные от ${endpoint}:`, result);
            return { success: true, data: result };

        } catch (error) {
            console.error(`Ошибка при запросе к ${endpoint}:`, error);
            return { success: false, error: error.message || 'Неизвестная ошибка сети' };
        }
    }

    async login(login, password) {
        return this.sendRequest('login', { login, password });
    }

    async register(email, login, password) {
        return this.sendRequest('register', { email, login, password });
    }
}

export const authService = new AuthService(); 
