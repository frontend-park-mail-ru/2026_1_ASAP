const BASE_URL = 'http://pulseapp.space:8080';

export class ChatService {
    async getChats() {
        const response = await fetch(`${BASE_URL}/api/v1/chats`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'});
        if (!response.ok)
            throw new Error(`Ошибка ${response.status}`);
        const data = await response.json();
        return data.body;
    };
}