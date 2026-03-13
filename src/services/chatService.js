const BASE_URL = 'http://pulseapp.space:8080';

/**
 * Сервис для работы с чатами. Загружает список чатов с сервера
 * или возвращает мок-данные в зависимости от флага `USE_MOCK`.
 */
export class ChatService {
    /**
     * Получает список чатов пользователя.
     * @returns {Promise<Array<{id: number, title: string, chat_type: string, last_message: object}>>}
     * @throws {Error} При ошибке HTTP-запроса.
     */
    async getChats() {
        const response = await fetch(`${BASE_URL}/api/v1/chats`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'});
            
        if (!response.ok)
            throw new Error(`Ошибка ${response.status}`);
        const data = await response.json();
        return data.body || [];
    };
}