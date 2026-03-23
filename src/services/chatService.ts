import { ChatDetail, Message as MessageType, User, DialogChat, GroupChat, ChannelChat } from '../types/chat.js';

const BASE_URL = 'http://pulseapp.space:8080';
// const BASE_URL = 'http://0.0.0.0:8080';

const MOCK_USERS: { [key: number]: User } = {
    1: { id: 1, login: 'currentuser', avatarUrl: '/assets/images/avatars/myAvatar.svg' },
    2: { id: 2, login: 'user2', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
    3: { id: 3, login: 'user3', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
    4: { id: 4, login: 'admin', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
};

const MOCK_CHATS: ChatDetail[] = [
    {
        id: 1,
        title: 'Личный чат с User2',
        type: 'dialog',
        avatarUrl: '/assets/images/avatars/chatAvatar.svg',
        lastMessage: {
            id: 1, sender: MOCK_USERS[2], text: 'Привет!', timestamp: new Date(), isOwn: false
        },
        interlocutor: MOCK_USERS[2],
        status: 'online',
        unreadCount: 2
    } as DialogChat,
    {
        id: 2,
        title: 'Рабочая группа',
        type: 'group',
        avatarUrl: '/assets/images/avatars/groupAvatar.svg',
        lastMessage: {
            id: 2, sender: MOCK_USERS[4], text: 'Всем привет!', timestamp: new Date(), isOwn: false
        },
        members: [MOCK_USERS[1], MOCK_USERS[2], MOCK_USERS[3], MOCK_USERS[4]],
        owner: MOCK_USERS[4],
        unreadCount: 5
    } as GroupChat,
    {
        id: 3,
        title: 'Новости IT',
        type: 'channel',
        avatarUrl: '/assets/images/avatars/channelAvatar.svg',
        lastMessage: {
            id: 3, sender: MOCK_USERS[4], text: 'Новая статья...', timestamp: new Date(), isOwn: false
        },
        subscribersCount: 1500,
        unreadCount: 0
    } as ChannelChat,
];

const MOCK_MESSAGES: { [chatId: number]: MessageType[] } = {
    1: [
        { id: 1, sender: MOCK_USERS[2], text: 'Привет!', timestamp: new Date(Date.now() - 120000), isOwn: false, status: 'read' },
        { id: 2, sender: MOCK_USERS[1], text: 'Как дела?', timestamp: new Date(Date.now() - 90000), isOwn: true, status: 'read' },
        { id: 3, sender: MOCK_USERS[2], text: 'Все хорошо, а у тебя?', timestamp: new Date(Date.now() - 60000), isOwn: false, status: 'delivered' },
        { id: 4, sender: MOCK_USERS[1], text: 'Тоже отлично, работаю над проектом.', timestamp: new Date(Date.now() - 30000), isOwn: true, status: 'sent' },
    ],
    2: [
        { id: 5, sender: MOCK_USERS[4], text: 'Всем привет, коллеги!', timestamp: new Date(Date.now() - 180000), isOwn: false, status: 'read' },
        { id: 6, sender: MOCK_USERS[3], text: 'Привет, админ!', timestamp: new Date(Date.now() - 150000), isOwn: false, status: 'read' },
        { id: 7, sender: MOCK_USERS[1], text: 'Что-то интересное?', timestamp: new Date(Date.now() - 120000), isOwn: true, status: 'read' },
    ],
    3: [
        { id: 8, sender: MOCK_USERS[4], text: 'Новая статья по фронтенду уже на канале!', timestamp: new Date(Date.now() - 240000), isOwn: false, status: 'read' },
    ]
};


/**
 * Сервис для работы с чатами. Загружает список чатов с сервера
 * или возвращает мок-данные в зависимости от флага `USE_MOCK`.
 */
export class ChatService {
    private USE_MOCK_DETAIL_AND_MESSAGES = true;

    /**
     * Получает список чатов пользователя.
     * @returns {Promise<ChatDetail[]>}
     * @throws {Error} При ошибке HTTP-запроса.
     */
    async getChats(): Promise<ChatDetail[]> {
        try {
            const response = await fetch(`${BASE_URL}/api/v1/chats`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                console.error(`Ошибка при получении списка чатов: ${response.status}`);
                throw new Error(`Ошибка ${response.status}`);
            }

            const data = await response.json();
            return data.body || [];
        } catch (error) {
            console.error("Ошибка сети или сервера при получении чатов:", error);
            return MOCK_CHATS;
        }
    }

    /**
     * Получает детальную информацию о конкретном чате.
     * @param {number} chatId - ID чата.
     * @returns {Promise<ChatDetail | undefined>} Детальная информация о чате или undefined, если не найден.
     */
    async getChatDetail(chatId: number): Promise<ChatDetail | undefined> {
        if (this.USE_MOCK_DETAIL_AND_MESSAGES) {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(MOCK_CHATS.find(chat => chat.id === chatId));
                }, 300);
            });
        }
        // TODO: Реализовать запрос к реальному API для получения деталей чата
        return undefined;
    }

    /**
     * Получает список сообщений для конкретного чата.
     * @param {number} chatId - ID чата.
     * @returns {Promise<MessageType[]>} Список сообщений.
     */
    async getMessages(chatId: number): Promise<MessageType[]> {
        if (this.USE_MOCK_DETAIL_AND_MESSAGES) {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(MOCK_MESSAGES[chatId] || []);
                }, 500); // Имитация задержки сети
            });
        }
        // TODO: Реализовать запрос к реальному API для получения сообщений
        return [];
    }
}

export const chatService = new ChatService();