const USE_MOCK = false;
const BASE_URL = 'http://0.0.0.0:8080';

export class ChatService {
    async getChats() {
        if (USE_MOCK) {
            return [
                {ID: 1, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 2, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 3, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 4, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 5, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 6, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 7, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 8, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 9, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 10, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 11, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 12, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
                {ID: 13, Title: 'Имя', LastMessage: 'Привет Привет Привет Привет Привет Привет Привет Привет'},
            ];
        }
        const response = await fetch(`${BASE_URL}/api/v1/chats`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'});
        if (!response.ok)
            throw new Error(`Ошибка ${response.status}`);
        return response.json();
    };
}