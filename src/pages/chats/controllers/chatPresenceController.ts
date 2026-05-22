import type { PresenceState } from "../../../core/utils/wsClient";
import { ChatsUseCases, chatsUseCases } from "../model/chatsUseCases";

interface ChatPresenceControllerDeps {
    useCases?: ChatsUseCases;
}

export class ChatPresenceController {
    private readonly useCases: ChatsUseCases;
    private unsubscribe: (() => void) | null = null;

    constructor(deps: ChatPresenceControllerDeps = {}) {
        this.useCases = deps.useCases ?? chatsUseCases;
    }

    public watchDialogInterlocutor(
        interlocutorId: number,
        onPresenceChange: (state: PresenceState) => void,
    ): void {
        this.stop();

        this.unsubscribe = this.useCases.subscribePresence(interlocutorId, onPresenceChange);

        const cached = this.useCases.getPresence(interlocutorId);
        if (cached) {
            onPresenceChange(cached);
            return;
        }

        void this.useCases.requestUserProfile(interlocutorId);
    }

    public emitTyping(chatId: string): void {
        this.useCases.emitTyping(chatId);
    }

    public stopTyping(chatId: string): void {
        this.useCases.stopTyping(chatId);
    }

    public stop(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    public destroy(): void {
        this.stop();
    }
}
