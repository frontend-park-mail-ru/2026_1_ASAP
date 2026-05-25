import { chatsUseCases, type ChatsUseCases } from "../model/chatsUseCases";

interface ChatNotificationPromptControllerOptions {
    showPrompt: (handlers: { onAllow: () => Promise<void>; onDismiss: () => void }) => void;
}

export class ChatNotificationPromptController {
    private alreadyShown = false;

    constructor(
        private readonly options: ChatNotificationPromptControllerOptions,
        private readonly useCases: ChatsUseCases = chatsUseCases,
    ) {}

    public maybeShow(): void {
        if (this.alreadyShown) return;

        const state = this.useCases.getNotificationPromptState();
        if (!state.visible) return;

        this.alreadyShown = true;

        this.useCases.dismissNotificationPrompt();

        this.options.showPrompt({
            onAllow: async () => {
                await this.useCases.requestNotificationPermission();
            },
            onDismiss: () => {
                this.useCases.dismissNotificationPrompt();
            },
        });
    }
}
