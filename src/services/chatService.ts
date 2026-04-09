import { ChatDetail, FrontendMessage, User, DialogChat, GroupChat, ChannelChat, BackendChat, BackendMessage } from '../types/chat';
import { httpClient } from '../core/utils/httpClient';

// const BASE_URL = "http://pulseapp.space:8080";
const BASE_URL = 'http://0.0.0.0:8080';

/**
 * @class ChatService
 * @description Сервис для управления чатами. Предоставляет методы для получения списка чатов,
 * детальной информации о чате, сообщений, а также для создания и удаления чатов.
 */
export class ChatService {
    
    /**
     * Преобразует BackendMessage в FrontendMessage.
     */
    private convertToFrontendMessage(backendMessage: any, currentUserId?: string): FrontendMessage {
        return {
            // Если бек не отдает ID сообщения, генерируем временный для ключей рендера
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
                    avatarUrl: '/assets/images/avatars/chatAvatar.svg',
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
                    avatarUrl: '/assets/images/avatars/chatAvatar.svg',
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
     * Получает список сообщений для конкретного чата.
     */
    public async getMessages(chatId: string, currentUserId: string): Promise<FrontendMessage[]> {
        try {
            // Предполагаемый REST эндпоинт для сообщений
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/messages`, {
                method: 'GET'
            });

            if (!response.ok) {
                //просто возвращаем пустой список, чтобы не ломать UI
                if (response.status !== 404) {
                    console.error(`Ошибка при получении сообщений: ${response.status}`);
                }
                return [];
            }

            const data = await response.json();
            
            if (data.status === 'success' && Array.isArray(data.body)) {
                return data.body.map((msg: any) => this.convertToFrontendMessage(msg, currentUserId));
            }
            
            return [];
        } catch (error) {
            console.error("Ошибка сети при получении сообщений:", error);
            return [];
        }
    }

    /**
     * Создает новый чат (Диалог или Группу)
     */
    public async createChat(title: string, members_id: number[], type: "dialog" | "group" | "channel"): Promise<any | null> {
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
     * @description Мок для обновления названия и/или аватарки группы
     * @param groupId ID группы
     * @param newName Новое название группы
     * @param newAvatar Новый файл аватарки (опционально)
     */
    public async updateGroupMock(groupId: string, newName: string, newAvatar?: File): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[Mock] Группа ${groupId} обновлена. Новое имя: ${newName}`);
                resolve(true);
            }, 500);
        });
    }

    /**
     * @description Мок для добавления участника в группу
     * @param groupId ID группы
     * @param userId ID пользователя
     */
    public async addMemberMock(groupId: string, userId: number): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[Mock] Пользователь ${userId} добавлен в группу ${groupId}`);
                resolve(true);
            }, 500);
        });
    }

    /**
     * @description Мок для удаления/исключения участника из группы (только owner)
     * @param groupId ID группы
     * @param userId ID пользователя для удаления
     */
    public async removeMemberMock(groupId: string, userId: number): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[Mock] Пользователь ${userId} исключен из группы ${groupId}`);
                resolve(true);
            }, 500);
        });
    }

    /**
     * @description Мок для самостоятельного выхода пользователя из группы
     * @param groupId ID группы
     */
    public async leaveGroupMock(groupId: string): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[Mock] Вы покинули группу ${groupId}`);
                resolve(true);
            }, 500);
        });
    }
}

export const chatService = new ChatService();