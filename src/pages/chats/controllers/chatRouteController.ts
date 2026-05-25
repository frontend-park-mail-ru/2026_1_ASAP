import type { ChatRouteState, CreateChatMode } from "../model/chatsViewModels";

const CHATS_ROOT = "/chats";
const CREATE_PREFIX = "/chats/create-";
const CREATE_MODES = new Set<CreateChatMode>(["dialog", "group", "channel"]);

export class ChatRouteController {
    public parse(path: string): ChatRouteState {
        const normalizedPath = this.normalizePath(path);

        if (normalizedPath === CHATS_ROOT) {
            return { kind: "root" };
        }

        if (normalizedPath.startsWith(CREATE_PREFIX)) {
            const mode = normalizedPath.slice(CREATE_PREFIX.length);
            if (CREATE_MODES.has(mode as CreateChatMode)) {
                return { kind: "create", mode: mode as CreateChatMode };
            }

            return { kind: "invalid", path: normalizedPath };
        }

        const match = /^\/chats\/(\d+)$/.exec(normalizedPath);
        if (match) {
            return { kind: "chat", chatId: match[1] };
        }

        return { kind: "invalid", path: normalizedPath };
    }

    private normalizePath(path: string): string {
        const [withoutHash] = path.split("#");
        const [withoutSearch] = withoutHash.split("?");
        const normalized = withoutSearch.replace(/\/+$/, "");
        return normalized || CHATS_ROOT;
    }
}

export const chatRouteController = new ChatRouteController();
