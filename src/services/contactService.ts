import { BackendContact, FrontendContact } from "../types/contact";
import { BackendProfile, FrontendProfile, ProfileAdditionalInfo, ProfileMainInfo } from "../types/profile";
import { httpClient } from "../core/utils/httpClient";

const host = window.location.hostname;
const BASE_URL = `${window.location.protocol}//${host}:8080`;

// const BASE_URL = 'http://pulseapp.space:8080';

const USE_MOCK = false;
const MOCK_CONTACTS: FrontendContact[] = [
    {
        contact_user_id: 1,
        contact_name: 'Алиса',
        avatarURL: '/assets/images/avatars/chatAvatar.svg',
    },
    {
        contact_user_id: 2,
        contact_name: 'Боб',
        avatarURL: '/assets/images/avatars/chatAvatar.svg',
    },
];

const MOCK_PROFILES: { [id: number]: FrontendProfile } = {
    1: {
        mainInfo: {
            firstName: 'Алиса',
            lastName: 'Иванова',
            avatarUrl: '/assets/images/avatars/profileAvatar.svg',
        },
        additionalInfo: {
            login: 'alice',
            email: 'alice@example.com',
            bio: 'Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код Люблю кофе и код'
        }
    },
    2: {
        mainInfo: {
            firstName: 'Боб',
            lastName: 'Петров',
            avatarUrl: '/assets/images/avatars/profileAvatar.svg',
        },
        additionalInfo: {
            login: 'bob',
            email: 'bob@example.com',
            birthDate: new Date('1998-05-14').toLocaleDateString('ru-RU'),
            bio: 'Просто Боб'
        }
    }
};

const MOCK_MY_PROFILE = {
  mainInfo: {
    firstName: "Альвин",
    lastName: "Смирнов",
    avatarUrl: "/assets/images/avatars/profileAvatar.svg",
    lastSeen: "был в сети в 21:47 7 марта",
  },
  additionalInfo: {
    login: "alvin_dev",
    email: "alvin@example.com",
    birthDate: new Date('1998-05-14').toLocaleDateString('ru-RU'),
    bio: "Фронтенд-разработчик. Люблю чистую архитектуру, TypeScript и удобные интерфейсы.",
  },
};

function formatLastSeen(date: Date): string {
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return `был(а) в сети в ${time} ${dateStr}`;
}

function birthDateToApiValue(raw: string | undefined): string | null {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
    if (m) {
        const dd = m[1].padStart(2, '0');
        const mm = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
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

export class ContactService {
    private convertToFrontendContact(backendContact: BackendContact): FrontendContact {
        const name = backendContact.first_name || backendContact.last_name
            ? `${backendContact.first_name || ''} ${backendContact.last_name || ''}`.trim()
            : `User#${backendContact.contact_user_id}`;

        return {
            contact_user_id: backendContact.contact_user_id,
            contact_name: name,
            avatarURL: backendContact.contact_avatar_url || '/assets/images/avatars/chatAvatar.svg',
        };
    };

    private convertToFrontendProfile(backendProfile: BackendProfile): FrontendProfile {
        return {
            mainInfo: {
                firstName: backendProfile.first_name,
                lastName: backendProfile.last_name || "",
                avatarUrl: backendProfile.avatar || "/assets/images/avatars/profileAvatar.svg",
                lastSeen: backendProfile.last_seen ? formatLastSeen(new Date(backendProfile.last_seen)) : undefined,
            },
            additionalInfo: {
                login: backendProfile.login,
                email: backendProfile.email,
                birthDate: backendProfile.birth_date ? new Date(backendProfile.birth_date).toLocaleDateString('ru-RU') : undefined,
                bio: backendProfile.bio || ""
            }
        };
    };


    async getContacts(): Promise<FrontendContact[]> {
        if (USE_MOCK) {
            return MOCK_CONTACTS;
        }
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
            const frontendContacts: FrontendContact[] = data.body.map(contact => {
                return this.convertToFrontendContact(contact);
            });
            return frontendContacts;

        } catch(error) {
            console.error(error);
            return [];
        }
    };

    async getProfileInfo(profileId: number | null): Promise<FrontendProfile> {
        if (USE_MOCK) {
            return MOCK_PROFILES[profileId] || MOCK_PROFILES[1];
        }
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
            const frontendProfile: FrontendProfile = this.convertToFrontendProfile(data.body);
            return frontendProfile;
        } catch(error) {
            console.error(error);
            return {
                mainInfo: {
                    firstName: "User"
                },
                additionalInfo: {
                    login: "User"
                }
            };
        }
    };

    async getMyProfile(): Promise<FrontendProfile> {
        if (USE_MOCK) {
            return MOCK_MY_PROFILE;
        }
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            if (!response.ok) {
                console.error("Ошибка при получении профиля");
                throw new Error(`Ошибка ${response.status}`);
            }
            const data: {status: string, body: BackendProfile} = await response.json();
            const frontendProfile: FrontendProfile = this.convertToFrontendProfile(data.body);
            return frontendProfile;
        } catch(error) {
            console.error(error);
            return {
                mainInfo: {
                    firstName: "User"
                },
                additionalInfo: {
                    login: "User"
                }
            };
        };
    };

    async uploadMyAvatar(file: File): Promise<{ success: boolean, status: number }> {
        if (USE_MOCK) {
            return { success: true, status: 200 };
        }

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
            return { success: true, status: 200 };
        } catch {
            return { success: false, status: 500 };
        }
    };

    async setMyProfile(_mainInfo: ProfileMainInfo, additionalInfo: ProfileAdditionalInfo): Promise<{success: boolean, status: number}> {
        const previousData = await this.getMyProfile();
        if (!previousData) {
            console.error("Не удалось получить данные профиля с бэкенда");
            return { success: false, status: 500 };
        }

        if (USE_MOCK) {
            const draftAvatar = _mainInfo.avatarUrl ?? '';
            if (!draftAvatar.startsWith('blob:')) {
                MOCK_MY_PROFILE.mainInfo.avatarUrl =
                    draftAvatar || '/assets/images/avatars/profileAvatar.svg';
            }
            const pf = (previousData.mainInfo.firstName ?? '').trim();
            const pl = (previousData.mainInfo.lastName ?? '').trim();
            const nf = (_mainInfo.firstName ?? '').trim();
            const nl = (_mainInfo.lastName ?? '').trim();
            if (pf !== nf) {
                MOCK_MY_PROFILE.mainInfo.firstName = nf;
            }
            if (pl !== nl) {
                MOCK_MY_PROFILE.mainInfo.lastName = nl;
            }
            if (previousData.additionalInfo.bio !== additionalInfo.bio) {
                MOCK_MY_PROFILE.additionalInfo.bio = additionalInfo.bio ?? '';
            }
            const mockPrevBirth = birthDateToApiValue(previousData.additionalInfo.birthDate);
            const mockNextBirth = birthDateToApiValue(additionalInfo.birthDate);
            if (mockPrevBirth !== mockNextBirth) {
                if (mockNextBirth !== null) {
                    MOCK_MY_PROFILE.additionalInfo.birthDate = additionalInfo.birthDate;
                } else {
                    delete MOCK_MY_PROFILE.additionalInfo.birthDate;
                }
            }
            return { success: true, status: 200 };
        }

        const prevFirst = (previousData.mainInfo.firstName ?? '').trim();
        const prevLast = (previousData.mainInfo.lastName ?? '').trim();
        const nextFirst = (_mainInfo.firstName ?? '').trim();
        const nextLast = (_mainInfo.lastName ?? '').trim();
        if (prevFirst !== nextFirst || prevLast !== nextLast) {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/name`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        first_name: nextFirst,
                        last_name: nextLast,
                    }),
                });
                if (response.status === 409) {
                    return { success: false, status: 409 };
                }
                if (!response.ok) {
                    console.error(`Ошибка при изменении имени и фамилии: ${response.status}`);
                    return { success: false, status: response.status };
                }
            } catch {
                return { success: false, status: 500 };
            }
        }

        if (previousData.additionalInfo.bio !== additionalInfo.bio) {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/bio`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        bio: additionalInfo.bio
                    })
                });

                if (response.status === 409) {
                    return { success: false, status: 409 };
                }
                if (!response.ok) {
                    console.error(`Ошибка при изменении био: ${response.status}`);
                    return { success: false, status: response.status };
                }
            } catch(error) {
                return { success: false, status: 500 };
            }
        }
        const prevBirthApi = birthDateToApiValue(previousData.additionalInfo.birthDate);
        const nextBirthApi = birthDateToApiValue(additionalInfo.birthDate);
        if (prevBirthApi !== nextBirthApi) {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me/birth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        birth_date: nextBirthApi,
                    })
                });

                if (response.status === 409) {
                    return { success: false, status: 409 };
                }
                if (!response.ok) {
                    console.error(`Ошибка при изменении дня рождения: ${response.status}`);
                    return { success: false, status: response.status };
                }
            } catch(error) {
                return { success: false, status: 500 };
            }
        }
        return { success: true, status: 200 };
    };
  
    async getMyId(): Promise<number> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me`, {
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if (!response.ok) {
                console.error("Ошибка при получении профиля");
                throw new Error(`Ошибка ${response.status}`);
            }
            const data: {status: string, body: BackendProfile} = await response.json();
            return data.body.user_id;
        } catch(error) {
            console.error(error);
            return;
        };
    };

    /**
     * Добавляет пользователя в контакты по логину.
     * @param {string} login - Логин пользователя для добавления.
     * @returns {Promise<boolean>} true, если контакт успешно добавлен.
     */
    public async addContact(login: string, id: number): Promise<{success: boolean, status: number}> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/contacts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    contact_user_id: id,
                    first_name: login,
                    last_name: ""
                })
            });

            if (response.status === 409) {
                return { success: false, status: 409 };
            }
            if (!response.ok) {
                console.error(`Ошибка при добавлении контакта: ${response.status}`);
                return { success: false, status: response.status };
            }
            return { success: true, status: 200 };
        } catch (error) {
            console.error("Ошибка сети при добавлении контакта:", error);
            return { success: false, status: 500 };
        }
    }

    public async getIdByLogin(login: string): Promise<{id: number | null, status: number}> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/search?login=${login}`, {
                method: 'Get',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            if (response.status === 404) {
                return { id: null, status: 404 };
            }
            if (!response.ok) {
                console.error(`Ошибка при поиске пользователя по логину: ${response.status}`);
                return { id: null, status: response.status };
            }
            const data: {status: string, body: BackendProfile} = await response.json();
            return { id: data.body.user_id, status: 200 };
        } catch (error) {
            console.error("Ошибка сети при поиске пользователя по логину:", error);
            return { id: null, status: 500 };
        }
    }
};

export const contactService = new ContactService();