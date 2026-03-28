/**
 * Интерфейс для пользователя (для sender в last_message).
 */
export interface User {
    // id: number;
    login: string;
    avatarUrl?: string;
}

/**
 * Интерфейс для сообщения с бэкенда (для last_message).
 */
export interface BackendMessage {
    sender: User;
    text: string;
    created_at: string;
}

/**
 * Интерфейс для сообщения, которое мы используем во фронтенде.
 * Мы будем конвертировать BackendMessage в этот формат.
 */
export interface FrontendMessage {
    id: string;
    sender: User;
    text: string;
    timestamp: Date; // Конвертируем created_at в Date
    isOwn: boolean;
}

/**
 * Интерфейс для чата, приходящего с бэкенда (из getChats).
 */
export interface BackendChat {
    id: string;
    title: string;
    chat_type: 'dialog' | 'group' | 'channel';
    last_message?: BackendMessage;
}

/**
 * Базовый интерфейс для чата во фронтенде.
 * ID теперь string. lastMessage теперь FrontendMessage.
 */
export interface BaseChat {
    id: string;
    title: string;
    avatarUrl?: string;
    lastMessage?: FrontendMessage;
    unreadCount?: number;
}

/**
 * Интерфейс для личного диалога во фронтенде.
 */
export interface DialogChat extends BaseChat {
    type: 'dialog';
    interlocutor: User;
}

/**
 * Интерфейс для группового чата во фронтенде.
 */
export interface GroupChat extends BaseChat {
    type: 'group';
    members: User[];
    owner: User;
    description?: string;
}

/**
 * Интерфейс для канала во фронтенде.
 */
export interface ChannelChat extends BaseChat {
    type: 'channel';
    subscribersCount: number;
    description?: string;
}

/**
 * Объединенный тип для любого чата во фронтенде.
 */
export type Chat = DialogChat | GroupChat | ChannelChat;

/**
 * Интерфейс для данных, которые ChatService будет возвращать (для ChatItem и т.д.).
 * Это то же самое, что и Chat.
 */
export type ChatDetail = Chat;