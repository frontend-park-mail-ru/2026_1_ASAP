import { PresenceState, wsClient } from "../core/utils/wsClient";

class PresenceService {
    private cache = new Map<number, PresenceState>();
    private listeners = new Map<number, Set<(state: PresenceState) => void>>();
    private typingThrottle = new Map<string, number>();
    private typingStopTimers = new Map<string, ReturnType<typeof setTimeout>>();

    private readonly TYPING_THROTTLE_MS = 3000;
    private readonly TYPING_STOP_DELAY_MS = 5000;

    public subscribe(userId: number, fn: (state: PresenceState) => void): () => void {
        if (!this.listeners!.has(userId)) {
            this.listeners.set(userId, new Set());
        }
        this.listeners!.get(userId)!.add(fn);
        return () => {
            const set = this.listeners.get(userId);
            if (!set) return;
            set.delete(fn);
            if (set.size === 0) this.listeners.delete(userId);
        };
    }

    public get(userId: number): PresenceState | null {
        return this.cache.get(userId) ?? null;
    }

    private notify(userId: number, partial: Partial<PresenceState>): void {
        const current = this.cache.get(userId) ?? {isOnline: false};
        const next = { ...current, ...partial };

        this.cache!.set(userId, next);
        this.listeners!.get(userId)?.forEach(fn => fn(next));
    }

    /**
     * Внешнее заполнение кэша (например, из HTTP-ответа профиля).
     * Использует ту же merge-логику что и WS-события.
     */
    public seed(userId: number, partial: Partial<PresenceState>): void {
        this.notify(userId, partial);
    }

    public emitTyping(chatId: string): void {
        const now = Date.now();
        const last = this.typingThrottle.get(chatId) ?? 0;

        if (now - last >= this.TYPING_THROTTLE_MS) {
            wsClient.sendIfOpen('presence.TypingStart', {chat_id: Number(chatId)});
            this.typingThrottle.set(chatId, now);
        }

        const existingStop = this.typingStopTimers.get(chatId);
        if (existingStop) clearTimeout(existingStop);

        const stopTimer = setTimeout(() => {
            wsClient.sendIfOpen('presence.TypingStop', {chat_id: Number(chatId)});
            this.typingThrottle.delete(chatId);
            this.typingStopTimers.delete(chatId);
        }, this.TYPING_STOP_DELAY_MS);
        this.typingStopTimers.set(chatId, stopTimer);
    }

    public stopTyping(chatId: string): void {
        const existingStop = this.typingStopTimers.get(chatId);
        if (existingStop) clearTimeout(existingStop);
        this.typingStopTimers.delete(chatId);

        if (this.typingThrottle.has(chatId)) {
            wsClient.sendIfOpen('presence.TypingStop', { chat_id: Number(chatId) });
            this.typingThrottle.delete(chatId);
        }
    }

    public init(): void {
        wsClient.subscribe<{ user_id: number }>('presence.Online', (dto) => {
            this.notify(dto.user_id, {isOnline: true});
        });
        wsClient.subscribe<{ user_id: number }>('presence.Offline', (dto) => {
            this.notify(dto.user_id, {isOnline: false});
        });
        wsClient.subscribe<{ user_id: number, last_seen_at: string }>('presence.LastSeen', (dto) => {
            this.notify(dto.user_id, {lastSeenAt: dto.last_seen_at ? new Date(dto.last_seen_at) : undefined});
        });
        wsClient.subscribe<{chat_id: number; user_id: number; typing: boolean}>('presence.Typing', (dto) => {
            this.notify(dto.user_id, {typingInChat: dto.typing ? dto.chat_id : undefined});
        });

        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    private handleVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
            wsClient.sendIfOpen('presence.Background', {});
        } else {
            wsClient.sendIfOpen('presence.Foreground', {});
        }
    }
};

export const presenceService = new PresenceService();