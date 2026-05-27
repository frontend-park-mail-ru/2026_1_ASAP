import type {
    ChatUpdatedAvatarDto,
    ChatUpdatedMembersDto,
    ChatUpdatedTitleDto,
    MessageClearDto,
    MessageDto,
    MessageReadDto,
    MessageUpdateDto,
    WsErrorDto,
    VoiceTranscriptDto,
} from "../../../core/utils/wsClient";
import { ChatsUseCases, chatsUseCases } from "../model/chatsUseCases";

export interface ProfileUpdatedPayload {
    id?: number;
    avatar_url?: string;
    avatarUrl?: string;
    avatar?: string;
}

interface ChatRealtimeControllerDeps {
    useCases?: ChatsUseCases;
    onNewMessage: (payload: MessageDto) => void | Promise<void>;
    onMessageUpdated: (payload: MessageUpdateDto) => void;
    onMessageDeleted: (payload: MessageClearDto) => void;
    onMessageRead: (payload: MessageReadDto) => void;
    onChatAvatarUpdated: (payload: ChatUpdatedAvatarDto) => void;
    onChatTitleUpdated: (payload: ChatUpdatedTitleDto) => void;
    onMembersUpdated: (payload: ChatUpdatedMembersDto) => void;
    onProfileUpdated: (payload: ProfileUpdatedPayload) => void;
    onVoiceTranscript: (payload: VoiceTranscriptDto) => void;
    onMessageError: (payload: WsErrorDto) => void | Promise<void>;
    onConnected: () => void;
    onDisconnected: () => void;
}

export class ChatRealtimeController {
    private readonly useCases: ChatsUseCases;
    private activeChatUnsubscribers: Array<() => void> = [];
    private pageUnsubscribers: Array<() => void> = [];

    constructor(private readonly deps: ChatRealtimeControllerDeps) {
        this.useCases = deps.useCases ?? chatsUseCases;
    }

    public startPageRealtime(): void {
        this.stopPageRealtime();
        this.pageUnsubscribers = [
            this.useCases.subscribeRealtime("system.Connected", this.deps.onConnected),
            this.useCases.subscribeRealtime("system.Disconnected", this.deps.onDisconnected),
        ];

        if (typeof window !== "undefined") {
            window.addEventListener("online", this.handleOnline);
            this.pageUnsubscribers.push(() => window.removeEventListener("online", this.handleOnline));
        }

        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker.addEventListener("message", this.handleSwMessage);
            this.pageUnsubscribers.push(() => navigator.serviceWorker.removeEventListener("message", this.handleSwMessage));
        }
    }

    public startActiveChatRealtime(): void {
        this.stopActiveChatRealtime();
        this.activeChatUnsubscribers = [
            this.useCases.subscribeRealtime<MessageDto>("message.New", this.deps.onNewMessage),
            this.useCases.subscribeRealtime<MessageUpdateDto>("message.Update", this.deps.onMessageUpdated),
            this.useCases.subscribeRealtime<MessageClearDto>("message.Clear", this.deps.onMessageDeleted),
            this.useCases.subscribeRealtime<MessageReadDto>("message.Read", this.deps.onMessageRead),
            this.useCases.subscribeRealtime<ChatUpdatedAvatarDto>("chat.Updated.Avatar", this.deps.onChatAvatarUpdated),
            this.useCases.subscribeRealtime<ChatUpdatedTitleDto>("chat.Updated.Title", this.deps.onChatTitleUpdated),
            this.useCases.subscribeRealtime<ChatUpdatedMembersDto>("chat.Updated.Members", this.deps.onMembersUpdated),
            this.useCases.subscribeRealtime<ProfileUpdatedPayload>("profile.Updated", this.deps.onProfileUpdated),
            this.useCases.subscribeRealtime<VoiceTranscriptDto>("message.VoiceTranscript", this.deps.onVoiceTranscript),
            this.useCases.subscribeRealtime<WsErrorDto>("error", this.deps.onMessageError),
        ];
    }

    public stopActiveChatRealtime(): void {
        this.activeChatUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.activeChatUnsubscribers = [];
    }

    public destroy(): void {
        this.stopActiveChatRealtime();
        this.stopPageRealtime();
    }

    private stopPageRealtime(): void {
        this.pageUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.pageUnsubscribers = [];
    }

    private readonly handleOnline = (): void => {
        void this.useCases.flushPendingMessages();
    };

    private readonly handleSwMessage = (event: MessageEvent): void => {
        if (event.data?.type === "flush-messages") {
            void this.useCases.flushPendingMessages();
        }
    };
}
