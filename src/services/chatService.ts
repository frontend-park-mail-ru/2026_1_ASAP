import { ChatDetail, FrontendMessage, User, DialogChat, GroupChat, ChannelChat, BackendChat, BackendMessage } from '../types/chat';

// const BASE_URL = 'http://pulseapp.space:8080';
const BASE_URL = 'http://0.0.0.0:8080';


const CURRENT_USER_LOGIN = 'alice'; 
const USE_MOCK_GET_CHATS = false;
const USE_MOCK_DETAIL_AND_MESSAGES = true;

// Моковые данные для деталей чатов
const MOCK_USERS: { [key: string]: User } = {
    'currentuser': { login: CURRENT_USER_LOGIN, avatarUrl: '/assets/images/avatars/myAvatar.svg' },
    'bob': { login: 'bob', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
    'alice': { login: 'alice', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
    'charlie': { login: 'charlie', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
    'diana': { login: 'diana', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
};

// Моковые детали чатов
const MOCK_CHAT_DETAILS: { [id: string]: ChatDetail } = {
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": { 
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        title: "Dialog 1",
        type: 'dialog',
        avatarUrl: '/assets/images/avatars/chatAvatar.svg',
        interlocutor: MOCK_USERS['bob'], 
        unreadCount: 0
    } as DialogChat,
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb": {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        title: "Backend Team",
        type: 'group',
        avatarUrl: '/assets/images/avatars/chatAvatar.svg',
        members: [MOCK_USERS['currentuser'], MOCK_USERS['bob'], MOCK_USERS['alice'], MOCK_USERS['charlie']],
        owner: MOCK_USERS['bob'],
        unreadCount: 3
    } as GroupChat,
};

// Моковые сообщения для каждого чата
const MOCK_MESSAGES: { [chatId: string]: FrontendMessage[] } = {
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa": [ // диалог1 (alice - bob)
        { id: "msg1", sender: MOCK_USERS['bob'], text: 'Привет!', timestamp: new Date(Date.now() - 120000), isOwn: false},
        { id: "msg2", sender: MOCK_USERS['currentuser'], text: 'Как дела?', timestamp: new Date(Date.now() - 90000), isOwn: true },
        { id: "msg3", sender: MOCK_USERS['bob'], text: 'Нам тут 5 лет исполнилось — точнее, нашему блогу на Хабре.Очень хотим вручить кому-то подарки по этому поводу. Долго думали, кому же. И придумали: подарок получат те, кто победит в нашем новом DevOps-челлендже.В чем суть головоломки: вы получите доступ к тестовому стенду с Kubernetes-кластером, ArgoCD и GitLab с Helm-чартом. В ArgoCD добавлено приложение, но оно не деплоится. Ваша задача — разобраться, что пошло не так, исправить конфигурацию и довести деплой до зелёного статуса.', 
            timestamp: new Date(Date.now() - 60000), isOwn: false},
        { id: "msg4", sender: MOCK_USERS['currentuser'], text: 'Привет! Наша команда сейчас проводит небольшое исследование про инвестиции и нам очень нужна помощь с коротким опросом (3–5 минут).Там всё максимально просто, без сложных вопросов. Нам не хватает совсем немного ответов, поэтому будем очень благодарны, если пройдёте🙏', 
            timestamp: new Date(Date.now() - 30000), isOwn: true },
    ],
    "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb": [ // Группа1 (alice, bob, charlie, currentuser)
        { id: "msg5", sender: MOCK_USERS['bob'], text: 'Всем привет, коллеги!', timestamp: new Date(Date.now() - 180000), isOwn: false},
        { id: "msg6", sender: MOCK_USERS['charlie'], text: 'Привет, босс!', timestamp: new Date(Date.now() - 150000), isOwn: false},
        { id: "msg7", sender: MOCK_USERS['currentuser'], text: 'Что-то интересное?', timestamp: new Date(Date.now() - 120000), isOwn: true},
    ],
};


/**
 * Сервис для работы с чатами. Загружает список чатов с сервера,
 * но мокает детали чатов и сообщения.
 */
export class ChatService {
    /**
     * Преобразует BackendMessage в FrontendMessage.
     * @param {BackendMessage} backendMessage - Сообщение с бэкенда.
     * @returns {FrontendMessage} Преобразованное сообщение.
     * @private
     */
    private convertToFrontendMessage(backendMessage: BackendMessage, currentUserId?: string): FrontendMessage {
        return {
            id: 'mock-msg-' + Math.random().toString(36).substring(2, 9), // Генерируем временный ID, если его нет
            sender: backendMessage.sender,
            text: backendMessage.text,
            timestamp: new Date(backendMessage.created_at),
            isOwn: backendMessage.sender.login === currentUserId, // Нужно передавать логин текущего пользователя
        };
    }

    /**
     * Получает список чатов пользователя.
     * @returns {Promise<ChatDetail[]>}
     * @throws {Error} При ошибке HTTP-запроса.
     */
    public async getChats(currentUserId?: string): Promise<ChatDetail[]> {
        if (USE_MOCK_GET_CHATS) {
            return new Promise(resolve => setTimeout(() => resolve(Object.values(MOCK_CHAT_DETAILS))));
        }
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

            const data: { status: string, body: BackendChat[] } = await response.json();
            const frontendChats: ChatDetail[] = data.body.map(chat => {
                let frontendChat: ChatDetail;

                const commonProps = {
                    id: chat.id,
                    title: chat.title,
                    type: chat.chat_type,
                    avatarUrl: chat.chat_type === 'dialog' ? '/assets/images/avatars/chatAvatar.svg' : '/assets/images/avatars/chatAvatar.svg',
                    unreadCount: Math.floor(Math.random() * 5), // Случайное кол-во непрочитанных
                };

                switch (chat.chat_type) {
                    case 'dialog':
                        frontendChat = {
                            ...commonProps,
                            interlocutor: MOCK_USERS['bob'], // Временный собеседник, нужно будет заменить на реального
                        } as DialogChat;
                        break;
                    case 'group':
                        frontendChat = {
                            ...commonProps,
                            members: [MOCK_USERS['currentuser'], MOCK_USERS['bob']], // Временные члены, нужно заменить
                            owner: MOCK_USERS['bob'],
                        } as GroupChat;
                        break;
                    case 'channel':
                        frontendChat = {
                            ...commonProps,
                            subscribersCount: 1000 // Временное значение, нужно будет заменить на реальное
                        } as ChannelChat;
                        break;
                }

                if (chat.last_message) {
                    frontendChat.lastMessage = this.convertToFrontendMessage(chat.last_message, currentUserId);
                }
                return frontendChat;
            });
            return frontendChats;
        } catch (error) {
            console.error("Ошибка сети или сервера при получении чатов:", error);
            // Возвращаем мок-данные при ошибке сети, чтобы приложение не падало
            return Object.values(MOCK_CHAT_DETAILS);
        }
    }

    /**
     * Получает детальную информацию о конкретном чате.
     * @param {string} chatId - ID чата (UUID).
     * @returns {Promise<ChatDetail | undefined>} Детальная информация о чате или undefined, если не найден.
     */
    public async getChatDetail(chatId: string): Promise<ChatDetail | undefined> {
        if (USE_MOCK_DETAIL_AND_MESSAGES) {         
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(MOCK_CHAT_DETAILS[chatId]);
                });
            });
        }
        // TODO: Реализовать запрос к реальному API для получения деталей чата
        return undefined;
    }

    /**
     * Получает список сообщений для конкретного чата.
     * @param {string} chatId - ID чата (UUID).
     * @param {string} currentUserId - Логин текущего пользователя для пометки isOwn.
     * @returns {Promise<FrontendMessage[]>} Список сообщений.
     */
    public async getMessages(chatId: string, currentUserId: string): Promise<FrontendMessage[]> {
        if (USE_MOCK_DETAIL_AND_MESSAGES) {
            return new Promise(resolve => {
                setTimeout(() => {
                    const messages = MOCK_MESSAGES[chatId] || [];
                    // Обновляем isOwn на основе currentUserId
                    const updatedMessages = messages.map(msg => ({
                        ...msg,
                        isOwn: msg.sender.login === currentUserId
                    }));
                    resolve(updatedMessages);
                });
            });
        }
        // TODO: Реализовать запрос к реальному API для получения сообщений
        return [];
    }

    /**
     * Создает новый чат (Диалог или Группу)
     * @param title Название чата
     * @param members_id Массив ID участников
     * @param type Тип чата ("dialog" или "group" или "channel")
     */
    public async createChat(id: number, title: string, members_id: number[], type: "dialog" | "group" | "channel"): Promise<any | null> {
        try {
            const response = await fetch(`${BASE_URL}/api/v1/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: id,
                    members_id: members_id,
                    title: title,
                    type: type
                })
            });

            if (!response.ok) {
                console.error(`Ошибка при создании чата: ${response.status}`);
                return null;
            }

            const data = await response.json();
            // Возвращаем данные созданного чата (там будет лежать новый id)
            if (data.status === 'success') {
                 return data.body; 
            }
            return null;
        } catch (error) {
            console.error("Ошибка сети при создании чата:", error);
            return null;
        }
    }












}

export const chatService = new ChatService();
