/**
 * @file Определяет типы данных, связанные с профилем пользователя.
 * @module types/profile
 *
 * @description Этот модуль содержит интерфейсы для представления профиля пользователя
 * в формате, получаемом от бэкенда, и в структурированном формате,
 * используемом на фронтенде.
 */

/**
 * @interface BackendProfile
 * @description Представление профиля пользователя в формате, получаемом от бэкенда.
 * @property {number} user_id - Уникальный ID пользователя.
 * @property {string} login - Логин пользователя.
 * @property {string} first_name - Имя пользователя.
 * @property {string} [email] - Email пользователя (опционально).
 * @property {string} [birth_date] - Дата рождения в формате строки (опционально).
 * @property {string} [last_name] - Фамилия пользователя (опционально).
 * @property {string} [avatar] - URL аватара (опционально).
 * @property {string} [bio] - Краткая биография (опционально).
 * @property {string} [last_seen] - Время последнего визита в формате строки (опционально).
 */
export interface BackendProfile {
    user_id: number;
    login: string;
    first_name: string;
    email?: string;
    birth_date?: string;
    last_name?: string;
    avatar?: string;
    bio?: string;
    last_seen?: string;
}

/**
 * @interface FrontendProfile
 * @description Структурированное представление профиля на фронтенде,
 * разделенное на основную и дополнительную информацию.
 * @property {ProfileMainInfo} mainInfo - Основная информация профиля.
 * @property {ProfileAdditionalInfo} additionalInfo - Дополнительная информация профиля.
 */
export interface FrontendProfile {
    mainInfo: ProfileMainInfo;
    additionalInfo: ProfileAdditionalInfo;
}

/**
 * @interface ProfileMainInfo
 * @description Основная, публичная информация о профиле пользователя.
 * @property {string} firstName - Имя пользователя.
 * @property {string} [lastName] - Фамилия пользователя (опционально).
 * @property {string} [avatarUrl] - URL аватара (опционально).
 * @property {string} [lastSeen] - Время последнего визита (опционально).
 */
export interface ProfileMainInfo {
    firstName: string;
    lastName?: string;
    avatarUrl?: string;
    lastSeen?: string;
}

/**
 * @interface ProfileAdditionalInfo
 * @description Дополнительная, более приватная информация о профиле пользователя.
 * @property {string} login - Логин пользователя.
 * @property {string} [email] - Email пользователя (опционально).
 * @property {string} [birthDate] - Дата рождения (опционально).
 * @property {string} [bio] - Краткая биография (опционально).
 */
export interface ProfileAdditionalInfo {
    login: string;
    email?: string;
    birthDate?: string;
    bio?: string;
};