import { BackendContact, FrontendContact } from "../types/contact";
import { BackendProfile, FrontendProfile, ProfileAdditionalInfo, ProfileMainInfo } from "../types/profile";
import { httpClient } from "../core/utils/httpClient";
import { sanitizeBioText } from "../utils/sanitizeBioText";

const host = window.location.hostname;
const BASE_URL = `${window.location.protocol}//${host}`;

const CACHE_KEY = 'current_user_profile';
const CACHE_VERSION = 1;

/**
 * Преобразует строковую дату в формат API (ГГГГ-ММ-ДД).
 * @param {string | undefined} raw - Исходная дата.
 * @returns {string | null}
 */
function birthDateToApiValue(raw: string | undefined): string | null {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
    if (m) {
        return `${m[3]}-${m[2]}-${m[1]}`;
    }
    const mLoose = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
    if (mLoose) {
        const dd = mLoose[1].padStart(2, '0');
        const mm = mLoose[2].padStart(2, '0');
        return `${mLoose[3]}-${mm}-${dd}`;
    }
    const t = new Date(s);
    if (!Number.isNaN(t.getTime())) {
        const y = t.getFullYear();
        const mo = String(t.getMonth() + 1).padStart(2, '0');
        const da = String(t.getDate()).padStart(2, '0');
        return `${y}-${mo}-${da}`;
    }
    return null;
}

/**
 * Форматирует дату последнего посещения.
 * @param {Date} date - Дата посещения.
 * @returns {string}
 */
function formatLastSeen(date: Date): string {
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return `был(а) в сети в ${time} ${dateStr}`;
}

/**
 * @class ContactService
 * @description Сервис для управления контактами и профилями пользователей.
 * Реализует кэширование профиля в LocalStorage и дедупликацию запросов.
 */
export class ContactService {
    private myProfile: FrontendProfile | null = null;
    private profilePromise: Promise<FrontendProfile> | null = null;
    private adminStatus: boolean | null = null;

    /**
     * Конвертирует данные контакта от бэкенда в формат фронтенда.
     * @private
     */
    private convertToFrontendContact(backendContact: BackendContact): FrontendContact {
        const name = backendContact.first_name || backendContact.last_name
            ? `${backendContact.first_name || ''} ${backendContact.last_name || ''}`.trim()
            : `User#${backendContact.contact_user_id}`;

        return {
            contact_user_id: backendContact.contact_user_id,
            contact_name: name,
            avatarURL: backendContact.contact_avatar_url || '/assets/images/avatars/defaultAvatar.svg',
        };
    };

    /**
     * Конвертирует данные профиля от бэкенда в формат фронтенда.
     * @private
     */
    private convertToFrontendProfile(backendProfile: BackendProfile): FrontendProfile {
        return {
            mainInfo: {
                firstName: backendProfile.first_name,
                lastName: backendProfile.last_name || "",
                avatarUrl: backendProfile.avatar || "/assets/images/avatars/defaultAvatar.svg",
                lastSeen: backendProfile.last_seen ? formatLastSeen(new Date(backendProfile.last_seen)) : undefined,
            },
            additionalInfo: {
                id: backendProfile.user_id,
                login: backendProfile.login,
                email: backendProfile.email,
                birthDate: backendProfile.birth_date ? new Date(backendProfile.birth_date).toLocaleDateString('ru-RU') : undefined,
                bio: sanitizeBioText(backendProfile.bio || "").trim(),
            }
        };
    };

    private saveToCache(profile: FrontendProfile): void {
        try {
            const data = {
                profile,
                _version: CACHE_VERSION,
                _timestamp: Date.now()
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Не удалось сохранить профиль в кэш", e);
        }
    }

    private loadFromCache(): FrontendProfile | null {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (data._version !== CACHE_VERSION) {
                this.clearCache();
                return null;
            }

            return data.profile;
        } catch (e) {
            console.error("Ошибка при чтении кэша профиля", e);
            this.clearCache();
            return null;
        }
    }

    /**
     * Очищает кэш профиля текущего пользователя.
     * Вызывается при логауте.
     */
    public clearCache(): void {
        localStorage.removeItem(CACHE_KEY);
        this.myProfile = null;
        this.profilePromise = null;
        this.adminStatus = null;
    }

    /**
     * Получает список контактов текущего пользователя.
     * @returns {Promise<FrontendContact[]>}
     */
    async getContacts(): Promise<FrontendContact[]> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/contacts`, {
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if (!response.ok) {
                console.error("Ошибка при получении контактов");
                throw new Error(`Ошибка ${response.status}`);
            }
            
            const data: {status: string, body: BackendContact[]} = await response.json();
            return data.body.map(contact => this.convertToFrontendContact(contact));

        } catch(error) {
            console.error(error);
            return [];
        }
    };

    /**
     * Получает информацию о профиле пользователя по ID.
     * @param {number | null} profileId - ID пользователя.
     * @returns {Promise<FrontendProfile>}
     */
    async getProfileInfo(profileId: number | null): Promise<FrontendProfile> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/${profileId}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error("Ошибка при получении профиля");
                throw new Error(`Ошибка ${response.status}`);
            }

            const data: {status: string, body: BackendProfile} = await response.json();
            return this.convertToFrontendProfile(data.body);
        } catch(error) {
            console.error(error);
            return {
                mainInfo: { firstName: "Пользователь" },
                additionalInfo: { id: profileId || 0, login: "User" }
            };
        }
    };

    /**
     * Получает профиль текущего пользователя.
     * Реализует SWR и дедупликацию запросов.
     * @returns {Promise<FrontendProfile>}
     */
    async getMyProfile(): Promise<FrontendProfile> {
        if (this.myProfile) return this.myProfile;

        // смотрим в localStorage
        const cached = this.loadFromCache();
        if (cached && !this.profilePromise) {
            this.myProfile = cached;
            this.fetchAndCacheProfile().catch(() => {});
            return cached;
        }

        // если запрос уже выполняется, возвращаем тот же Promise
        if (this.profilePromise) return this.profilePromise;

        // 4. Идем в сеть
        this.profilePromise = this.fetchAndCacheProfile();
        return this.profilePromise;
    };

    /**
     * Всегда делает сетевой запрос и обновляет кэш.
     * @private
     */
    private async fetchAndCacheProfile(): Promise<FrontendProfile> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }

            const data: {status: string, body: BackendProfile} = await response.json();
            const frontendProfile: FrontendProfile = this.convertToFrontendProfile(data.body);
            
            this.myProfile = frontendProfile;
            this.saveToCache(frontendProfile);
            
            return frontendProfile;
        } catch(error) {
            console.error("Ошибка при получении профиля", error);
            const fallback: FrontendProfile = {
                mainInfo: { firstName: "Пользователь" },
                additionalInfo: { id: 0, login: "user" }
            };
            return this.myProfile || fallback;
        } finally {
            this.profilePromise = null;
        }
    }

    /**
     * Возвращает закешированный профиль текущего пользователя.
     * @returns {FrontendProfile | null}
     */
    public getLocalProfile(): FrontendProfile | null {
        return this.myProfile || this.loadFromCache();
    }

    /**
     * Загружает аватар текущего пользователя.
     * @param {File} file - Файл аватара.
     */
    async uploadMyAvatar(file: File): Promise<{ success: boolean, status: number }> {
        const formData = new FormData();
        formData.append("avatar", file, file.name);

        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/avatar`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            if (!response.ok) {
                return { success: false, status: response.status };
            }
            // Обновляем кэш после успешной загрузки аватара
            await this.fetchAndCacheProfile();
            return { success: true, status: 200 };
        } catch {
            return { success: false, status: 500 };
        }
    };

    /**
     * Обновляет данные профиля текущего пользователя.
     */
    async setMyProfile(_mainInfo: ProfileMainInfo, additionalInfo: ProfileAdditionalInfo): Promise<{success: boolean, status: number}> {
        const previousData = await this.getMyProfile();
        if (!previousData) {
            console.error("Не удалось получить данные профиля");
            return { success: false, status: 500 };
        }

        const prevFirst = (previousData.mainInfo.firstName ?? '').trim();
        const prevLast = (previousData.mainInfo.lastName ?? '').trim();
        const nextFirst = (_mainInfo.firstName ?? '').trim();
        const nextLast = (_mainInfo.lastName ?? '').trim();

        if (prevFirst !== nextFirst || prevLast !== nextLast) {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/name`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        first_name: nextFirst,
                        last_name: nextLast,
                    }),
                });
                if (response.status === 409) return { success: false, status: 409 };
                if (!response.ok) return { success: false, status: response.status };
            } catch {
                return { success: false, status: 500 };
            }
        }

        if (previousData.additionalInfo.bio !== additionalInfo.bio) {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/bio`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bio: additionalInfo.bio })
                });
                if (response.status === 409) return { success: false, status: 409 };
                if (!response.ok) return { success: false, status: response.status };
            } catch {
                return { success: false, status: 500 };
            }
        }

        const prevBirthApi = birthDateToApiValue(previousData.additionalInfo.birthDate);
        const nextBirthApi = birthDateToApiValue(additionalInfo.birthDate);
        if (prevBirthApi !== nextBirthApi) {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/birth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ birth_date: nextBirthApi })
                });
                if (response.status === 409) return { success: false, status: 409 };
                if (!response.ok) return { success: false, status: response.status };
            } catch {
                return { success: false, status: 500 };
            }
        }
        
        // после всех изменений принудительно обновляем локальный кэш
        await this.fetchAndCacheProfile();
        return { success: true, status: 200 };
    };
  
    /**
     * Возвращает ID текущего пользователя.
     */
    async getMyId(): Promise<number> {
        const profile = await this.getMyProfile();
        return profile.additionalInfo.id;
    };

    /**
     * Добавляет пользователя в контакты по логину.
     * @param {string} login - Логин пользователя для добавления.
     * @param {number} id - ID пользователя.
     * @returns {Promise<{success: boolean, status: number, code: string}>}
     */
    public async addContact(login: string, id: number): Promise<{success: boolean, status: number, code: string}> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/contacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contact_user_id: id,
                    first_name: login,
                    last_name: ""
                })
            });
            
            let errorCode = '';
            if (!response.ok) {
                try {
                    const data = await response.json();
                    if (data.errors && data.errors.length > 0) errorCode = data.errors[0].code;
                } catch {}
                return { success: false, status: response.status, code: errorCode };
            }

            return { success: true, status: 200, code: '' };
        } catch (error) {
            return { success: false, status: 500, code: '' };
        }
    }

    /**
     * Удаляет пользователя из контактов по ID.
     * @param {number} contactUserId - ID контакта для удаления.
     * @returns {Promise<{success: boolean, status: number, code: string}>}
     */
    public async deleteContact(contactUserId: number): Promise<{success: boolean, status: number, code: string}> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/contacts/${contactUserId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            let errorCode = '';
            if (!response.ok) {
                try {
                    const data = await response.json();
                    if (data.errors && data.errors.length > 0) errorCode = data.errors[0].code;
                } catch {}
                return { success: false, status: response.status, code: errorCode };
            }

            return { success: true, status: 200, code: '' };
        } catch (error) {
            return { success: false, status: 500, code: '' };
        }
    }

    /**
     * Находит ID пользователя по его логину.
     */
    public async getIdByLogin(login: string): Promise<{id: number | null, status: number}> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/search?login=${login}`, {
                method: 'Get',
                headers: { 'Content-Type': 'application/json' },
            });
            if (response.status === 404) return { id: null, status: 404 };
            if (!response.ok) return { id: null, status: response.status };

            const data: {status: string, body: BackendProfile} = await response.json();
            return { id: data.body.user_id, status: 200 };
        } catch (error) {
            return { id: null, status: 500 };
        }
    };

    public async deleteAvatar(): Promise<{status: number, profile: FrontendProfile | null }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/avatar`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.status === 404) return { status: 404, profile: null };
            if (!response.ok) return { status: response.status, profile: null };

            const data: {status: string, body: BackendProfile } = await response.json();
            return { status: 200, profile: this.convertToFrontendProfile(data.body) };
        } catch(error) {
            return { status: 500, profile: null };
        }
    }

    /**
     * Проверяет, является ли текущий пользователь администратором.
     * Администратор в текущем приложении зарезервирован за логином `admin`.
     * Для него дополнительно проверяется доступность admin endpoint.
     * Результат кэшируется до логаута.
     */
    public async isAdmin(): Promise<boolean> {
        if (this.adminStatus !== null) return this.adminStatus;
        try {
            const profile = await this.getMyProfile();
            if (profile.additionalInfo.login !== 'admin') {
                this.adminStatus = false;
                return this.adminStatus;
            }

            const response = await httpClient.request(`${BASE_URL}/api/v1/complaints/all`, {
                ignoreUnauthorized: true,
            });
            this.adminStatus = response.ok;
        } catch {
            this.adminStatus = false;
        }
        return this.adminStatus;
    }
};

export const contactService = new ContactService();
