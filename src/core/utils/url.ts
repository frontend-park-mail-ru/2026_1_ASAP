/**
 * @file url.ts
 * @description Утилиты для работы с URL и путями к ресурсам.
 */

const host = window.location.hostname;
const BASE_URL = `${window.location.protocol}//${host}:8080`;

/**
 * Преобразует относительный путь от бэкенда в полный URL.
 * Если путь уже является полным URL или отсутствует, возвращает его без изменений
 * (или дефолтное значение, если оно передано).
 * 
 * @param path - Путь к ресурсу (например, /media/avatars/1.png).
 * @param defaultPath - Путь по умолчанию, если основной отсутствует.
 * @returns {string} Полный URL или путь к дефолтному ресурсу.
 */
export const getFullUrl = (path?: string, defaultPath: string = '/assets/images/avatars/defaultAvatar.svg'): string => {
    if (!path || path === '' || path.includes('defaultAvatar.svg')) {
        return defaultPath;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${BASE_URL}/${cleanPath}`;
};
