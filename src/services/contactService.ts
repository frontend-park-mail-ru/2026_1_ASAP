import { BackendContact, FrontendContact } from "../types/contact";
import { BackendProfile, FrontendProfile } from "../types/profile";

const BASE_URL = 'http://pulseapp.space:8080';
const USE_MOCK = true;
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
export class ContactService {
    private convertToFrontendContact(backendContact: BackendContact): FrontendContact {
        return {
            contact_user_id: backendContact.contact_user_id,
            contact_name: backendContact.contact_name || `User#${backendContact.contact_user_id}`,
            avatarURL: backendContact.avatar || '/assets/images/avatars/chatAvatar.svg',
        };
    };

    private convertToFrontendProfile(backendProfile: BackendProfile): FrontendProfile {
        return {
            mainInfo: {
                firstName: backendProfile.first_name,
                lastName: backendProfile.last_name || "",
                avatarUrl: backendProfile.avatar || "/assets/images/avatars/profileAvatar.svg",
                lastSeen: backendProfile.last_seen ? new Date(backendProfile.last_seen).toLocaleDateString('ru-RU') : undefined,
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
            const response = await fetch(`${BASE_URL}/api/v1/contacts`, {
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
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
            const response = await fetch(`${BASE_URL}/api/v1/profile/${profileId}`, {
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
        }
    };
};

export const contactService = new ContactService();