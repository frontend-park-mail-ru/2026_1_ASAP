import { ChatDetail, FrontendMessage, User, DialogChat, GroupChat, ChannelChat, BackendChat, BackendMessage } from '../types/chat';
import { httpClient } from '../core/utils/httpClient';
import { wsClient, MessageDto } from '../core/utils/wsClient';

const host = window.location.hostname;
// const BASE_URL = `${window.location.protocol}//${host}:8080`;
const BASE_URL = 'http://pulseapp:8080';

/**
 * @class ChatService
 * @description Сервис для управления чатами. Предоставляет методы для получения списка чатов,
 * детальной информации о чате, сообщений, а также для создания и удаления чатов.
 */
export class ChatService {
    
    /**
     * Преобразует BackendMessage (REST) в FrontendMessage.
     * @param backendMessage - «сырой» объект сообщения из REST-ответа.
     * @param currentUserId  - Логин текущего пользователя для определения авторства.
     */
    private convertToFrontendMessage(backendMessage: any, currentUserId?: string): FrontendMessage {
        return {
            // Если бек не отдаёт ID сообщения, генерируем временный для ключей рендера
            id: backendMessage.id?.toString() || Math.random().toString(36).substring(2, 9),
            sender: backendMessage.sender || { login: 'unknown', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
            text: backendMessage.text,
            // Учитываем, что на беке поле может называться created_at или CreatedAt
            timestamp: new Date(backendMessage.created_at || backendMessage.CreatedAt || Date.now()),
            // Проверяем авторство (учитываем, что бек может отдавать sender_id вместо объекта)
            isOwn: (backendMessage.sender?.login === currentUserId) || (backendMessage.sender_id?.toString() === currentUserId?.toString()),
        };
    }

    /**
     * Конвертирует WS-DTO сообщения (MessageDto) во фронтендную модель FrontendMessage.
     * Используется в подписчиках WebSocket для добавления новых сообщений в UI без перерисовки.
     *
     * @param dto           - DTO сообщения, полученное из WebSocket-пакета.
     * @param currentUserId - ID текущего пользователя для определения поля `isOwn`.
     * @returns {FrontendMessage} Сообщение в формате фронтенда.
     */
    public convertWsMessageDto(dto: MessageDto, currentUserId: number): FrontendMessage {
        return {
            id: dto.id.toString(),
            sender: {
                login: dto.login ?? `user_${dto.sender_id}`,
                avatarUrl: '/assets/images/avatars/chatAvatar.svg',
            },
            text: dto.text,
            timestamp: new Date(dto.created_at),
            isOwn: dto.sender_id === currentUserId || dto.sender_id.toString() === currentUserId.toString(),
        };
    }

    /**
     * Отправляет сообщение в текущий чат через WebSocket.
     * Формат пакета: `{ type: "message.Send", payload: { text } }`.
     *
     * @param chatId - Строковый ID чата (не используется в payload, так как он в URL сокета).
     * @param text   - Текст отправляемого сообщения.
     */
    public sendMessage(chatId: string, text: string): void {
        wsClient.send('message.Send', {
            chat_id: Number(chatId),
            text,
        });
    }

    /**
     * Получает список чатов пользователя.
     */
    public async getChats(currentUserId?: string): Promise<ChatDetail[]> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                console.error(`Ошибка при получении списка чатов: ${response.status}`);
                return [];
            }

            const data = await response.json();
            
            if (data.status !== 'success' || !data.body) {
                return [];
            }

            const frontendChats: ChatDetail[] = data.body.map((chat: any) => {
                let frontendChat: ChatDetail;

                const commonProps = {
                    id: chat.id.toString(),
                    title: chat.title,
                    type: chat.chat_type,
                    avatarUrl: chat.avatar || '/assets/images/avatars/chatAvatar.svg',
                    unreadCount: 0,
                };

                switch (chat.chat_type) {
                    case 'dialog':
                        frontendChat = {
                            ...commonProps,
                            interlocutor: { login: chat.title, avatarUrl: '/assets/images/avatars/chatAvatar.svg' }, 
                        } as DialogChat;
                        break;
                    case 'group':
                        frontendChat = {
                            ...commonProps,
                            members: [], // Пока бек не отдает список участников
                            owner: { login: 'owner', avatarUrl: '/assets/images/avatars/chatAvatar.svg' },
                        } as GroupChat;
                        break;
                    case 'channel':
                        frontendChat = {
                            ...commonProps,
                            subscribersCount: 0 
                        } as ChannelChat;
                        break;
                    default:
                        frontendChat = { ...commonProps } as any;
                }

                if (chat.last_message) {
                    frontendChat.lastMessage = this.convertToFrontendMessage(chat.last_message, currentUserId);
                }
                
                return frontendChat;
            });
            
            return frontendChats;
        } catch (error) {
            console.error("Ошибка сети или сервера при получении чатов:", error);
            return []; // Возвращаем пустой массив, чтобы просто показать пустой список, а не падать
        }
    }

    /**
     * Получает детальную информацию о конкретном чате.
     */
    public async getChatDetail(chatId: string): Promise<ChatDetail | undefined> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}`, {
                method: 'GET'
            });

            if (!response.ok) {
                console.error(`Ошибка при получении деталей чата: ${response.status}`);
                return undefined;
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.body) {
                const chat = data.body;
                
                return {
                    id: chat.id.toString(),
                    title: chat.title,
                    type: chat.chat_type,
                    avatarUrl: chat.avatar || '/assets/images/avatars/chatAvatar.svg',
                    unreadCount: 0
                } as ChatDetail;
            }
            
            return undefined;
        } catch (error) {
            console.error("Ошибка сети при получении деталей чата:", error);
            return undefined;
        }
    }

    /**
     * Получает список сообщений для конкретного чата через WebSocket (паттерн Request-Response).
     * Отправляет запрос "message.Receive" и ждёт ответа "message.Get".
     * 
     * @param chatId - ID чата.
     * @param currentUserId - ID текущего пользователя.
     * @returns {Promise<FrontendMessage[]>} Промис со списком сообщений.
     */
    public async getMessages(chatId: string, currentUserId: number): Promise<FrontendMessage[]> {
        return new Promise((resolve) => {
            const timeoutMs = 5000;
            
            /**
             * Временный обработчик для получения истории сообщений.
             */
            const handleGetMessages = (payload: any) => {
                clearTimeout(timeout);
                wsClient.unsubscribe('message.Get', handleGetMessages);
                
                // Бэкенд возвращает объект { messages: MessageDto[], has_more: boolean }
                const messagesArray = payload && payload.messages ? payload.messages : payload;

                if (Array.isArray(messagesArray)) {
                    const messages = messagesArray.map((msg: MessageDto) => 
                        this.convertWsMessageDto(msg, currentUserId)
                    ).reverse();
                    resolve(messages);
                } else {
                    resolve([]);
                }
            };

            // Подписываемся на событие получения истории
            wsClient.subscribe('message.Get', handleGetMessages);

            // Отправляем запрос на получение последних 50 сообщений
            wsClient.send('message.Receive', { 
                chat_id: Number(chatId),
                limit: 50,
                before_id: null 
            });

            const timeout = setTimeout(() => {
                wsClient.unsubscribe('message.Get', handleGetMessages);
                console.warn(`getMessages: Таймаут ожидания ответа от сервера для чата ${chatId}`);
                resolve([]);
            }, timeoutMs);
        });
    }

    /**
     * Создает новый чат (Диалог или Группу)
     */
    public async createChat(members_id: number[], type: "dialog" | "group" | "channel", title?: string): Promise<any | null> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
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
            if (data.status === 'success') {
                 return data.body; 
            }
            return null;
        } catch (error) {
            console.error("Ошибка сети при создании чата:", error);
            return null;
        }
    }

    /**
     * Удаляет чат.
     */
    public async deleteChat(chatId: string): Promise<boolean> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error(`Ошибка при удалении чата: ${response.status}`);
                return false;
            }

            const data = await response.json();
            return data.status === 'success';
        } catch (error) {
            console.error("Ошибка сети при удалении чата:", error);
            return false;
        }
    }

    /**
     * Обновляет название группового чата.
     * @param chatId — Идентификатор чата.
     * @param title — Новое название (макс. 100 символов, не пустое).
     * @returns true, если запрос завершился успешно.
     */
    public async updateChatTitle(chatId: string, title: string): Promise<boolean> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/title`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });

            if (!response.ok) {
                console.error(`Ошибка при обновлении названия чата: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Ошибка сети при обновлении названия чата:', error);
            return false;
        }
    }

    /**
     * Добавляет участников в групповой чат.
     * @param chatId — Идентификатор чата.
     * @param userIds — Массив ID пользователей для добавления (не пустой, без дубликатов).
     * @returns true, если запрос завершился успешно.
     */
    public async addMembersToChat(chatId: string, userIds: number[]): Promise<boolean> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ members_id: userIds })
            });

            if (!response.ok) {
                console.error(`Ошибка при добавлении участников: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Ошибка сети при добавлении участников:', error);
            return false;
        }
    }

    /**
     * Обновляет аватарку группового чата.
     * Использует FormData — заголовок Content-Type НЕ указывается вручную,
     * чтобы браузер корректно проставил multipart/form-data с boundary.
     * @param chatId — Идентификатор чата.
     * @param file — Файл изображения (макс. 5 МБ; допустимые типы: jpeg, jpg, png, webp, gif).
     * @returns true, если запрос завершился успешно.
     */
    public async updateChatAvatar(chatId: string, file: File): Promise<boolean> {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/avatar`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error(`Ошибка при обновлении аватарки чата: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Ошибка сети при обновлении аватарки:', error);
            return false;
        }
    }

    /**
     * Получает список ID всех участников чата.
     * @param chatId — Идентификатор чата.
     * @returns Массив ID участников.
     */
    public async getChatMembers(chatId: string): Promise<number[]> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members`, {
                method: 'GET'
            });

            if (!response.ok) {
                console.error(`Ошибка при получении участников чата: ${response.status}`);
                return [];
            }

            const data = await response.json();
            if (data.status === 'success' && data.body && Array.isArray(data.body.members_id)) {
                return data.body.members_id;
            }
            return [];
        } catch (error) {
            console.error('Ошибка сети при получении участников чата:', error);
            return [];
        }
    }

    /**
     * Удаляет участника из группового чата.
     * @param chatId — Идентификатор чата.
     * @param userId — ID пользователя для удаления.
     * @returns Объект с флагом успеха и HTTP-статусом.
     */
    public async removeMember(chatId: string, userId: number): Promise<{ success: boolean; status: number }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ member_id: userId })
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            console.error(`Ошибка при удалении участника: ${response.status}`);
            return { success: false, status: response.status };
        } catch (error) {
            console.error('Ошибка сети при удалении участника:', error);
            return { success: false, status: 500 };
        }
    }
}

export const chatService = new ChatService();