import type { FrontendContact } from "../../../types/contact";
import type { SearchContactsResult } from "../../../types/search";
import { ChatsUseCases, chatsUseCases } from "../model/chatsUseCases";
import type { ContactSearchScope } from "../model/chatsViewModels";

interface ChatCreationControllerDeps {
    useCases?: ChatsUseCases;
    getCurrentUserId: () => number | null;
    onCreated: (chatId: string) => void;
    onError: (message: string) => void;
}

export class ChatCreationController {
    private readonly useCases: ChatsUseCases;

    constructor(private readonly deps: ChatCreationControllerDeps) {
        this.useCases = deps.useCases ?? chatsUseCases;
    }

    public loadContacts(): Promise<FrontendContact[]> {
        return this.useCases.loadContacts();
    }

    public searchContacts(query: string, scope: ContactSearchScope): Promise<SearchContactsResult | null> {
        return this.useCases.searchContacts(query, scope);
    }

    public async createDialog(contactId: number, contactLogin?: string): Promise<void> {
        const currentUserId = await this.getCurrentUserId();
        if (currentUserId === null) return;

        const result = await this.useCases.createDialogChat(currentUserId, contactId, contactLogin);
        if (result.success && result.chatId) {
            this.deps.onCreated(result.chatId);
        }
    }

    public async createGroup(userIds: number[], groupName: string): Promise<void> {
        const currentUserId = await this.getCurrentUserId();
        if (currentUserId === null) return;

        const result = await this.useCases.createGroupChat(currentUserId, userIds, groupName);
        if (result.success && result.chatId) {
            this.deps.onCreated(result.chatId);
        }
    }

    public async createChannel(title: string): Promise<void> {
        const currentUserId = await this.getCurrentUserId();
        if (currentUserId === null) return;

        const result = await this.useCases.createChannel({ title }, currentUserId);
        if (result.success && result.channelId) {
            this.deps.onCreated(result.channelId);
            return;
        }

        const message = result.status === 403
            ? "У вас нет прав на создание канала"
            : "Не удалось создать канал. Попробуйте ещё раз";
        this.deps.onError(message);
    }

    private async getCurrentUserId(): Promise<number | null> {
        const currentUserId = this.deps.getCurrentUserId();
        if (currentUserId !== null) return currentUserId;

        try {
            const currentUser = await this.useCases.loadCurrentUser();
            return currentUser.id;
        } catch (error) {
            this.deps.onError("Не удалось определить текущего пользователя");
            return null;
        }
    }
}
