/**
 * @file Определяет типы данных, связанные с контактами.
 * @module types/contact
 *
 * @description Этот модуль содержит интерфейсы для представления контактов
 * в формате, получаемом от бэкенда, и в формате, используемом на фронтенде.
 */

/**
 * @interface BackendContact
 * @description Представление контакта в формате, получаемом от бэкенда.
 * @property {number} user_id - ID пользователя, которому принадлежит контакт.
 * @property {number} contact_user_id - ID пользователя, который является контактом.
 * @property {string} contact_name - Имя контакта (логин пользователя-контакта).
 * @property {string} [avatar] - URL аватара контакта (опционально).
 * @property {string} created_at - Временная метка создания в формате ISO-строки.
 */
export interface BackendContact {
    user_id: number;
    contact_user_id: number;
    contact_name: string;
    avatar?: string;
    created_at: string;
};

export interface FrontendContact {
    contact_user_id: number;
    contact_name: string;
    avatarURL: string;
};
