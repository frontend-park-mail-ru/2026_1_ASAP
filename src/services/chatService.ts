import { ChatDetail, FrontendMessage, User, DialogChat, GroupChat, ChannelChat, BackendChat, BackendMessage } from '../types/chat';
import { httpClient } from '../core/utils/httpClient';
import { wsClient, MessageDto, ChatInformationDto } from '../core/utils/wsClient';
import { getFullUrl } from '../core/utils/url';
import { offlineQueue, PendingMessage } from './offlineMessageQueue';

const host = window.location.hostname;
const BASE_URL = `${window.location.protocol}//${host}`;

/**
 * @class ChatService
 * @description Сервис для управления чатами. Предоставляет методы для получения списка чатов,
 * детальной информации о чате, сообщений, а также для создания и удаления чатов.
 */
export class ChatService {
    private profilesCache: Map<number, User> = new Map();
    private pendingProfiles: Map<number, Promise<User | null>> = new Map();
    private inFlightMessages = new Set<string>(); //сообщения, которые уже отправлены и ждут ответа
    private isFlushing = false; //блокировка от параллельного запуска 

    /**
     * Преобразует BackendMessage (REST) в FrontendMessage.
     * @param backendMessage - «сырой» объект сообщения из REST-ответа.
     * @param currentUserId  - ID или логин текущего пользователя для определения авторства.
     */
    private convertToFrontendMessage(backendMessage: any, currentUserId?: string | number): FrontendMessage {
        const login = backendMessage.sender?.login || backendMessage.login || (backendMessage.sender_id ? `user_${backendMessage.sender_id}` : 'unknown');
        
        return {
            id: backendMessage.id?.toString() || Math.random().toString(36).substring(2, 9),
            sender: { 
                id: Number(backendMessage.sender_id || backendMessage.sender?.id || 0),
                login: login, 
                avatarUrl: getFullUrl(backendMessage.sender?.avatar || backendMessage.avatar),
                firstName: backendMessage.sender?.first_name || backendMessage.first_name,
                lastName: backendMessage.sender?.last_name || backendMessage.last_name,
            },
            text: backendMessage.text,
            timestamp: new Date(backendMessage.created_at || Date.now()),
            isOwn: (backendMessage.sender?.login === currentUserId) || 
                   (backendMessage.login === currentUserId) ||
                   (String(backendMessage.sender_id) === String(currentUserId)),
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
    public convertWsMessageDto(dto: MessageDto, currentUserId: number | string): FrontendMessage {
        return {
            id: dto.id?.toString(),
            sender: {
                id: Number(dto.sender_id),
                login: dto.login ?? `user_${dto.sender_id || 0}`,
                avatarUrl: getFullUrl(dto.avatar),
                firstName: dto.first_name,
                lastName: dto.last_name,
            },
            text: dto.text || '',
            timestamp: new Date(dto.created_at || Date.now()),
            isOwn: String(dto.sender_id) === String(currentUserId) || dto.login === currentUserId,
        };
    }

    /**
     * Преобразует DTO чата (ChatInformationDto) из WebSocket во фронтендную модель ChatDetail.
     * Безопасно обрабатывает отсутствие последнего сообщения.
     * 
     * @param dto           - DTO чата из WebSocket.
     * @param currentUserId - ID текущего пользователя.
     * @returns {ChatDetail} Объект чата для фронтенда.
     */
    public mapChatDtoToChat(dto: ChatInformationDto, currentUserId: number): ChatDetail {
        const commonProps: any = {
            id: dto.id.toString(),
            title: dto.title,
            avatarUrl: getFullUrl(dto.avatar),
            unreadCount: 0,
            type: dto.chat_type as 'dialog' | 'group' | 'channel',
            owner_id: (dto as any).owner_id,
        };

        let chat: ChatDetail;

        switch (dto.chat_type) {
            case 'dialog':
                chat = {
                    ...commonProps,
                    interlocutor: { login: dto.title, avatarUrl: commonProps.avatarUrl },
                } as DialogChat;
                break;
            case 'group':
                chat = {
                    ...commonProps,
                    members: [],
                    owner: { id: (dto as any).owner_id || 0, login: 'owner', avatarUrl: getFullUrl() },
                } as GroupChat;
                break;
            case 'channel':
                chat = {
                    ...commonProps,
                    subscribersCount: 0,
                } as ChannelChat;
                break;
            default:
                chat = { ...commonProps } as any;
        }

        if (dto.last_message && dto.last_message.id !== 0 && (dto.last_message.id !== undefined || dto.last_message.created_at)) {
            chat.lastMessage = this.convertWsMessageDto(dto.last_message, currentUserId);
        }

        return chat;
    }

    /**
     * Отправляет сообщение в текущий чат через WebSocket с offline-очередью.
     * Сначала кладёт запись в IndexedDB (persistent), затем пробует отправить через WS.
     * Если SyncManager доступен — регистрирует `flush-messages`, чтобы SW разбудил флаш при восстановлении сети.
     *
     * @param chatId   - Строковый ID чата.
     * @param text     - Текст отправляемого сообщения.
     * @param senderId - ID текущего пользователя (нужен для оптимистичной модели и дедупа).
     * @returns PendingMessage с tempId для привязки оптимистичного DOM-узла.
     */
    public async sendMessage(chatId: string, text: string, senderId: number): Promise<PendingMessage> {
        const pending: PendingMessage = {
            tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            chatId,
            text,
            senderId,
            createdAt: Date.now(),
        };

        await offlineQueue.enqueue(pending);
        if (wsClient.isConnected()) {
            this.inFlightMessages.add(pending.tempId);
            wsClient.sendIfOpen('message.Send', {
                chat_id: Number(chatId),
                text,
            });
        }

        if (!navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {            
            try {
                const reg = await navigator.serviceWorker.ready;
                await (reg as any).sync.register('flush-messages');
            } catch (e){
                console.warn('SyncManager failed', e);
            }
        }

        return pending;
    }

    /**
     * Пере-проталкивает все pending-сообщения в WebSocket.
     * Вызывается при `online`, `system.Connected` и сообщении от SW.
     * Элементы удаляются не здесь, а при приходе серверного broadcast `message.New` (см. resolveServerMessage).
     */
    public async flushQueue(): Promise<void> {
        if (this.isFlushing) return;

        if (!wsClient.isConnected()) return;

        this.isFlushing = true;

        try {
            const pending = await offlineQueue.getAll();
            for (const m of pending) {

                if (this.inFlightMessages.has(m.tempId)) continue;
                
                this.inFlightMessages.add(m.tempId);
                
                const sent = wsClient.sendIfOpen('message.Send', {
                    chat_id: Number(m.chatId),
                    text: m.text,
                });
                
                // Если внезапно сокет закрылся во время цикла
                if (!sent) {
                    this.inFlightMessages.delete(m.tempId);
                    break;
                }
            }
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Сопоставляет пришедшее от сервера сообщение с оптимистичным из очереди.
     * Если совпадение найдено — удаляет запись из IndexedDB и возвращает её tempId
     * (UI должен заменить DOM-узел вместо добавления дубликата).
     */
    private unescapeHtml(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#34;/g, '"')
            .replace(/&#39;/g, "'");
    }

    public async resolveServerMessage(dto: MessageDto, currentUserId: number): Promise<string | null> {
        if (dto.sender_id !== currentUserId) return null;

        const pending = await offlineQueue.getByChat(dto.chat_id.toString());
        const unescapedText = this.unescapeHtml(dto.text ?? '');
        const match = pending.find((m) => m.text === unescapedText);

        if (!match) return null;

        await offlineQueue.remove(match.tempId);
        this.inFlightMessages.delete(match.tempId);

        return match.tempId;
    }

    /**
     * Вызывать при обрыве соединения, чтобы сбросить In-Flight статус.
     * Иначе при реконнекте flushQueue проигнорирует сообщения, думая, что они все еще летят.
     */
    public clearInFlight(): void {
        this.inFlightMessages.clear();
    }

    /**
     * Получает список чатов пользователя.
     */
    public async getChats(currentUserId?: string | number): Promise<ChatDetail[]> {
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
                    avatarUrl: getFullUrl(chat.avatar),
                    unreadCount: 0,
                };

                switch (chat.chat_type) {
                    case 'dialog':
                        frontendChat = {
                            ...commonProps,
                            interlocutor: { 
                                id: 0, 
                                login: chat.title, 
                                avatarUrl: chat.avatar || '/assets/images/avatars/defaultAvatar.svg' 
                            }, 
                        } as DialogChat;
                        break;
                    case 'group':
                        frontendChat = {
                            ...commonProps,
                            members: [], // Пока бек не отдает список участников
                            owner: { login: 'owner', avatarUrl: getFullUrl() },
                        } as GroupChat;
                        break;
                    case 'channel':
                        frontendChat = {
                            ...commonProps,
                            subscribersCount: chat.subscribers_count || 0 
                        } as ChannelChat;
                        break;
                    default:
                        frontendChat = { ...commonProps } as any;
                }

                // Бэкенд может прислать пустую заглушку (zero-value) для нового чата, где id = 0 или объект пуст
                if (chat.last_message && chat.last_message.id !== 0 && (chat.last_message.id !== undefined || chat.last_message.created_at)) {
                    frontendChat.lastMessage = this.convertToFrontendMessage(chat.last_message, currentUserId);
                }
                
                return frontendChat;
            });
            
            return frontendChats;
        } catch (error) {
            console.error("Ошибка сети или сервера при получении чатов:", error);
            return [];
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
                
                const commonProps = {
                    id: chat.id.toString(),
                    title: chat.title,
                    type: chat.chat_type,
                    avatarUrl: getFullUrl(chat.avatar),
                    unreadCount: 0,
                    owner_id: chat.owner_id
                };

                switch (chat.chat_type) {
                    case 'dialog':
                        return {
                            ...commonProps,
                            interlocutor: {
                                id: 0,
                                login: chat.title,
                                avatarUrl: commonProps.avatarUrl
                            }
                        } as DialogChat;

                    case 'group':
                        return {
                            ...commonProps,
                            members: [],
                            owner: { id: chat.owner_id || 0, login: 'owner', avatarUrl: getFullUrl() },
                        } as GroupChat;

                    case 'channel':
                        return {
                            ...commonProps,
                            subscribersCount: chat.subscribers_count || 0
                        } as ChannelChat;

                    default:
                        console.error(`ChatService: неизвестный тип чата ${chat.chat_type}`);
                        return undefined;
                }
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
     * @param beforeId - ID сообщения, до которого загружать историю (для пагинации).
     * @returns {Promise<{ messages: FrontendMessage[], hasMore: boolean, nextBeforeId: number | null } | null>} Промис с объектом данных или null при таймауте.
     */
    public async getMessages(chatId: string, currentUserId: number, beforeId: number | null = null): Promise<{ messages: FrontendMessage[], hasMore: boolean, nextBeforeId: number | null } | null> {
        return new Promise((resolve) => {
            const timeoutMs = 5000;
            
            const handleGetMessages = (payload: any) => {
                clearTimeout(timeout);
                wsClient.unsubscribe('message.Get', handleGetMessages);
                
                // Бэкенд возвращает объект { messages: MessageDto[], has_more: boolean, next_before_id: number }
                const messagesArray = payload && payload.messages ? payload.messages : payload;

                if (Array.isArray(messagesArray)) {
                    const messages = messagesArray.map((msg: MessageDto) => 
                        this.convertWsMessageDto(msg, currentUserId)
                    ).reverse();
                    
                    resolve({ 
                        messages, 
                        hasMore: payload.has_more || false, 
                        nextBeforeId: payload.next_before_id || null 
                    });
                } else {
                    resolve({ messages: [], hasMore: false, nextBeforeId: null });
                }
            };

            wsClient.subscribe('message.Get', handleGetMessages);

            wsClient.send('message.Receive', { 
                chat_id: Number(chatId),
                limit: 50,
                before_id: beforeId 
            });

            const timeout = setTimeout(() => {
                wsClient.unsubscribe('message.Get', handleGetMessages);
                console.warn(`getMessages: Таймаут ожидания ответа от сервера для чата ${chatId}`);
                // Возвращаем null вместо пустой истории, чтобы фронт понял, что это ошибка
                resolve(null);
            }, timeoutMs);
        });
    }

    /**
     * Создает новый чат (Диалог или Группу).
     * @param members_id - Список ID участников.
     * @param type - Тип чата.
     * @param title - Заголовок чата (необязательно).
     * @returns Объект с результатом операции: флаг успеха, HTTP статус и тело ответа.
     */
    public async createChat(members_id: number[], type: "dialog" | "group" | "channel", title?: string): Promise<{ success: boolean; status: number; body?: any }> {
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

            let body: any = null;
            if (response.ok || response.status === 409) {
                try {
                    const data = await response.json();
                    if (data.status === 'success') {
                        body = data.body;
                    }
                } catch (e) {
                    console.error("ChatService: ошибка парсинга JSON", e);
                }
            }

            return { 
                success: response.ok, 
                status: response.status, 
                body: body 
            };
        } catch (error) {
            console.error("Ошибка сети при создании чата:", error);
            return { success: false, status: 500 };
        }
    }

    /**
     * Удаляет чат.
     */
    public async deleteChat(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode: string | undefined;
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }

            return { success: false, status: response.status, errorCode };
        } catch (error) {
            console.error("Ошибка сети при удалении чата:", error);
            return { success: false, status: 500 };
        }
    }

    public async leaveChat(chatId: number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/quit`, {
                method: 'POST',
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode = '';
            let errorMessage = '';
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                    errorMessage = data.errors[0].message;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }

            return { success: false, status: response.status, errorCode, errorMessage };
        } catch (error) {
            console.error("ChatService: ошибка при выходе из чата:", error);
            return { success: false, status: 500 };
        }
    }

    /**
     * @deprecated Используйте leaveChat
     */
    public async leaveGroup(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.leaveChat(Number(chatId));
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
    public async addMembersToChat(chatId: string, userIds: number[]): Promise<{ success: boolean; status: number; errorCode?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ members_id: userIds })
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode: string | undefined;
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                }
            } catch (e) {
                // Игнорируем ошибки парсинг а
            }

            return { success: false, status: response.status, errorCode };
        } catch (error) {
            console.error('Ошибка сети при добавлении участников:', error);
            return { success: false, status: 500 };
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

    // TODO: удалить, когда бэк начнёт возвращать chat_id в ответе на 409
    public async findExistingDialogChatId(targetId: number, targetLogin?: string): Promise<string | undefined> {
        const chats = await this.getChats();
        const dialogs = chats.filter(c => c.type === 'dialog');

        if (targetLogin) {
            const byLogin = dialogs.find(c => (c as any).interlocutor?.login === targetLogin);
            if (byLogin) return byLogin.id;
        }

        for (const d of dialogs) {
            const members = await this.getChatMembers(d.id);
            if (members.includes(targetId)) return d.id;
        }

        return undefined;
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

    /**
     * Получает профиль пользователя по его ID. Использует внутренний кэш и дедупликацию запросов.
     * @param userId - Числовой ID пользователя.
     * @returns {Promise<User | null>} Объект пользователя или null в случае ошибки.
     */
    public async getUserProfile(userId: number): Promise<User | null> {
        if (this.profilesCache.has(userId)) {
            return this.profilesCache.get(userId)!;
        }

        if (this.pendingProfiles.has(userId)) {
            return this.pendingProfiles.get(userId)!;
        }

        const profilePromise = (async () => {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) return null;

                const data = await response.json();
                if (data.status === 'success' && data.body) {
                    const profile = data.body;
                    const user: User = {
                        id: userId,
                        login: profile.login,
                        avatarUrl: getFullUrl(profile.avatar),
                        firstName: profile.first_name,
                        lastName: profile.last_name
                    };
                    this.profilesCache.set(userId, user);
                    return user;
                }
                return null;
            } catch (error) {
                return null;
            } finally {
                this.pendingProfiles.delete(userId);
            }
        })();

        this.pendingProfiles.set(userId, profilePromise);
        return profilePromise;
    }
}

export const chatService = new ChatService();