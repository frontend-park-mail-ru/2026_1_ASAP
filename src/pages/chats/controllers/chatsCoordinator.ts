import { ChatRouteController, chatRouteController } from "./chatRouteController";
import type { CreateChatMode } from "../model/chatsViewModels";

export interface ChatsCoordinatorHandlers {
    showRoot: () => void | Promise<void>;
    openChat: (chatId: string) => void | Promise<void>;
    openCreate: (mode: CreateChatMode) => void | Promise<void>;
    openInvalid: (path: string) => void | Promise<void>;
    afterRoute?: () => void;
}

export class ChatsCoordinator {
    constructor(
        private readonly handlers: ChatsCoordinatorHandlers,
        private readonly routeController: ChatRouteController = chatRouteController,
    ) {}

    public init(path: string): Promise<void> {
        return this.routeTo(path);
    }

    public async routeTo(path: string): Promise<void> {
        try {
            const route = this.routeController.parse(path);

            switch (route.kind) {
            case "root":
                await this.handlers.showRoot();
                break;
            case "chat":
                await this.handlers.openChat(route.chatId);
                break;
            case "create":
                await this.handlers.openCreate(route.mode);
                break;
            case "invalid":
                await this.handlers.openInvalid(route.path);
                break;
            }
        } finally {
            this.handlers.afterRoute?.();
        }
    }

    public destroy(): void {}
}
