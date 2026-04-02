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
                avatarUrl: backendProfile.avatar || "",
                lastSeen: backendProfile.last_seen ? new Date(backendProfile.last_seen) : undefined,
            },
            additionalInfo: {
                login: backendProfile.login,
                email: backendProfile.email || "",
                birthDate: backendProfile.birth_date ? new Date(backendProfile.birth_date) : undefined,
                bio: backendProfile.bio || ""
            }
        };
    };

    async getContacts(): Promise<FrontendContact[]> {
        if (USE_MOCK) {
            return new Promise(resolve => setTimeout(() => resolve(MOCK_CONTACTS), 300));
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