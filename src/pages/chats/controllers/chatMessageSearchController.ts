import { MessageSearchBar } from "../../../components/composite/messageSearchBar/messageSearchBar";
import type { MessageList } from "../../../components/composite/messageList/messageList";
import type { Chat } from "../../../types/chat";
import type { ActiveChatVM } from "../model/chatsViewModels";
import { ChatSessionController } from "./chatSessionController";

interface ChatMessageSearchControllerDeps {
    sessionController: ChatSessionController;
    getCurrentUserId: () => number | null;
    getSearchSlot: () => HTMLElement | null;
    getMessageList: () => MessageList | null;
    getActiveChat: () => Chat | null;
    getPaginationState: () => { hasMoreHistory: boolean; nextBeforeId: number | null };
    setPaginationState: (state: { hasMoreHistory: boolean; nextBeforeId: number | null }) => void;
}

export class ChatMessageSearchController {
    private searchBar: MessageSearchBar | null = null;

    constructor(private readonly deps: ChatMessageSearchControllerDeps) {}

    public isOpen(): boolean {
        return this.searchBar !== null;
    }

    public toggle(chat: Chat): void {
        if (this.searchBar) {
            this.close();
            return;
        }

        this.open(chat);
    }

    public close(): void {
        this.searchBar?.unmount();
        this.searchBar = null;
        this.deps.getMessageList()?.setHighlightQuery("");
    }

    public destroy(): void {
        this.close();
    }

    private open(chat: Chat): void {
        const currentUserId = this.deps.getCurrentUserId();
        if (currentUserId === null) return;

        const slot = this.deps.getSearchSlot();
        if (!slot) return;

        this.searchBar = new MessageSearchBar({
            chatId: chat.id,
            chatType: chat.type,
            currentUserId,
            onClose: () => this.close(),
            onSearch: (query, beforeId) => this.deps.sessionController.searchMessages(
                chat.id,
                query,
                currentUserId,
                beforeId ?? null,
            ),
            onResults: (query) => {
                this.deps.getMessageList()?.setHighlightQuery(query);
            },
            onJumpTo: (messageId) => {
                void this.jumpToMessage(messageId);
            },
            getLoadedMessages: () => this.deps.getMessageList()?.getLoadedMessages() ?? [],
        });
        this.searchBar.mount(slot);
    }

    private async jumpToMessage(messageId: string): Promise<void> {
        const messageList = this.deps.getMessageList();
        if (!messageList) return;
        if (messageList.scrollToMessage(messageId)) return;

        let iterations = 0;
        const maxIterations = 5;

        while (iterations < maxIterations) {
            const { hasMoreHistory, nextBeforeId } = this.deps.getPaginationState();
            const activeChat = this.deps.getActiveChat();
            const currentUserId = this.deps.getCurrentUserId();

            if (!hasMoreHistory || !nextBeforeId || !activeChat || currentUserId === null) break;

            const result = await this.deps.sessionController.loadMoreMessages(activeChat, currentUserId, nextBeforeId);
            if (!result) break;

            this.deps.setPaginationState({
                hasMoreHistory: result.hasMore,
                nextBeforeId: result.nextBeforeId,
            });
            this.deps.getMessageList()?.prependMessages(result.messages as ActiveChatVM["messages"]);

            if (this.deps.getMessageList()?.scrollToMessage(messageId)) return;
            iterations++;
        }
    }
}
