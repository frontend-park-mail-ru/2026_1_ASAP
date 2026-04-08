import { BackendContact, FrontendContact } from "../types/contact";
import { BackendProfile, FrontendProfile } from "../types/profile";
import { httpClient } from "../core/utils/httpClient";

// const BASE_URL = 'http://pulseapp.space:8080';
const BASE_URL = 'http://0.0.0.0:8080';
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

function formatLastSeen(date: Date): string {
    const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return `был(а) в сети в ${time} ${dateStr}`;
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
                email: backendProfile.email || "",
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
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me`, {
                headers: {
                    'Content-Type': 'application.json'
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
        };
    };

    async getMyId(): Promise<number> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/me`, {
                headers: {
                    'Content-Type': 'application.json'
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