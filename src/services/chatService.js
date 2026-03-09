const USE_MOCK = false;
const BASE_URL = 'http://pulseapp.space:8080';

export class ChatService {
    async getChats() {
        if (USE_MOCK) {
            return [
                { id: 1, title: 'Иван Иванов',    chat_type: 'dialog',  last_message: { text: 'Привет! Как дела?',         sender: { login: 'ivan' },    created_at: '10:00' } },
                { id: 2, title: 'Команда проекта', chat_type: 'group',   last_message: { text: 'Встреча завтра в 10:00',    sender: { login: 'alina' },   created_at: '09:45' } },
                { id: 3, title: 'Новости BMSTU',   chat_type: 'channel', last_message: { text: 'Расписание обновлено',      sender: { login: 'admin' },   created_at: '08:30' } },
                { id: 4, title: 'Мария Петрова',   chat_type: 'dialog',  last_message: { text: 'Спасибо за помощь!',        sender: { login: 'maria' },   created_at: 'Вчера' } },
                { id: 5, title: 'Фронтенд-чат',    chat_type: 'group',   last_message: { text: 'PR готов к ревью',          sender: { login: 'dmitry' },  created_at: 'Вчера' } },
            ];
        }
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