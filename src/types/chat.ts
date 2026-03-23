/**
 * @file Типы данных для чатов и сообщений.
 */

/**
 * Интерфейс для пользователя.
 */
export interface User {
    id: number;
    login: string;
    avatarUrl?: string;
}

/**
 * Интерфейс для одного сообщения.
 */
export interface Message {
    id: number;
    sender: User;
    text: string;
    timestamp: Date;
    isOwn: boolean;
    status?: 'sent' | 'delivered' | 'read';
}

/**
 * Базовый интерфейс для чата.
 */
export interface BaseChat {
    id: number;
    title: string;
    avatarUrl?: string;
    lastMessage?: Message;
    unreadCount?: number;
}

/**
 * Интерфейс для личного диалога.
 */
export interface DialogChat extends BaseChat {
    type: 'dialog';
    interlocutor: User;
    status: 'online' | 'offline' | 'typing...';
}

/**
 * Интерфейс для группового чата.
 */
export interface GroupChat extends BaseChat {
    type: 'group';
    members: User[];
    owner: User;
    description?: string;
}

/**
 * Интерфейс для канала.
 */
export interface ChannelChat extends BaseChat {
    // todo: доделать, когда будут нужны каналы
    type: 'channel';
    subscribersCount: number;
    description?: string;

}

/**
 * Объединенный тип для любого чата.
 */
export type Chat = DialogChat | GroupChat | ChannelChat;

/**
 * Интерфейс для данных, которые ChatService будет возвращать.
 * Теперь это тот же тип, что и Chat, чтобы избежать несоответствий.
 */
export type ChatDetail = Chat;