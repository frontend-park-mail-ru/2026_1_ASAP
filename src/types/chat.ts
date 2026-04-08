/**
 * @file Определяет типы данных, связанные с чатами и сообщениями.
 * @module types/chat
 *
 * @description Этот модуль содержит интерфейсы и типы для представления
 * пользователей, сообщений и различных видов чатов (диалоги, группы, каналы)
 * как в формате, получаемом от бэкенда, так и в формате, используемом
 * на фронтенде.
 */

/**
 * @interface User
 * @description Представление пользователя в контексте чата.
 * @property {string} login - Логин пользователя.
 * @property {string} [avatarUrl] - URL аватара пользователя (опционально).
 */
export interface User {
    // id: number;
    login: string;
    avatarUrl?: string;
}

/**
 * @interface BackendMessage
 * @description Представление сообщения в формате, получаемом от бэкенда.
 * @property {User} sender - Объект пользователя-отправителя.
 * @property {string} text - Текст сообщения.
 * @property {string} created_at - Временная метка создания в формате ISO-строки.
 */
export interface BackendMessage {
    sender: User;
    text: string;
    created_at: string;
}

/**
 * @interface FrontendMessage
 * @description Представление сообщения в формате, используемом на фронтенде.
 * @property {string} id - Уникальный идентификатор сообщения.
 * @property {User} sender - Объект пользователя-отправителя.
 * @property {string} text - Текст сообщения.
 * @property {Date} timestamp - Временная метка, преобразованная в объект `Date`.
 * @property {boolean} isOwn - Флаг, указывающий, является ли сообщение отправленным текущим пользователем.
 */
export interface FrontendMessage {
    id: string;
    sender: User;
    text: string;
    timestamp: Date; // Конвертируем created_at в Date
    isOwn: boolean;
}

/**
 * @interface BackendChat
 * @description Представление чата в формате, получаемом от бэкенда.
 * @property {string} id - Уникальный идентификатор чата.
 * @property {string} title - Название чата.
 * @property {'dialog' | 'group' | 'channel'} chat_type - Тип чата.
 * @property {BackendMessage} [last_message] - Последнее сообщение в чате (опционально).
 */
export interface BackendChat {
    id: string;
    title: string;
    chat_type: 'dialog' | 'group' | 'channel';
    last_message?: BackendMessage;
}

/**
 * @interface BaseChat
 * @description Базовый интерфейс для представления чата на фронтенде.
 * @property {string} id - Уникальный идентификатор чата.
 * @property {string} title - Название чата.
 * @property {string} [avatarUrl] - URL аватара чата (опционально).
 * @property {FrontendMessage} [lastMessage] - Последнее сообщение в формате фронтенда (опционально).
 * @property {number} [unreadCount] - Количество непрочитанных сообщений (опционально).
 */
export interface BaseChat {
    id: string;
    title: string;
    avatarUrl?: string;
    lastMessage?: FrontendMessage;
    unreadCount?: number;
}

/**
 * @interface DialogChat
 * @description Представление личного диалога на фронтенде.
 * @extends BaseChat
 * @property {'dialog'} type - Тип чата.
 * @property {User} interlocutor - Пользователь-собеседник.
 */
export interface DialogChat extends BaseChat {
    type: 'dialog';
    interlocutor: User;
}

/**
 * @interface GroupChat
 * @description Представление группового чата на фронтенде.
 * @extends BaseChat
 * @property {'group'} type - Тип чата.
 * @property {User[]} members - Массив участников группы.
 * @property {User} owner - Владелец группы.
 * @property {string} [description] - Описание группы (опционально).
 */
export interface GroupChat extends BaseChat {
    type: 'group';
    members: User[];
    owner: User;
    description?: string;
}

/**
 * @interface ChannelChat
 * @description Представление канала на фронтенде.
 * @extends BaseChat
 * @property {'channel'} type - Тип чата.
 * @property {number} subscribersCount - Количество подписчиков.
 * @property {string} [description] - Описание канала (опционально).
 */
export interface ChannelChat extends BaseChat {
    type: 'channel';
    subscribersCount: number;
    description?: string;
}

/**
 * @type Chat
 * @description Объединённый тип, представляющий любой вид чата на фронтенде.
 */
export type Chat = DialogChat | GroupChat | ChannelChat;

/**
 * @type ChatDetail
 * @description Псевдоним для типа `Chat`. Используется для ясности в коде,
 * где требуется детальная информация о чате.
 */
export type ChatDetail = Chat;