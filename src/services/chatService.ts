import {
    ChatDetail,
    FrontendMessage,
    User,
    DialogChat,
    GroupChat,
    ChannelChat,
    MessageAttachment,
    OutgoingMessageAttachment,
    MessageAttachmentType,
} from '../types/chat';
import { SearchChatHit, SearchChatsResult, SearchMessageHit, SearchMessagesResult } from '../types/search';
import { httpClient } from '../core/utils/httpClient';
import { wsClient, MessageDto, ChatInformationDto, MessageAttachmentDto, WsErrorDto, StickerDto, parseVoiceTranscript } from '../core/utils/wsClient';
import { getFullUrl } from '../core/utils/url';
import { presenceService } from './presenceService';
import { offlineQueue, PendingMessage } from './offlineMessageQueue';
import { subscriptionService } from './subscriptionService';
import { isNonVoiceAttachmentPlaceholderText } from '../utils/lastMessagePreview';

import { BASE_URL } from '../core/utils/apiBase';

interface BackendMessageLike {
    id?: string | number;
    sender?: Partial<User> & {
        avatar?: string | null;
        first_name?: string;
        last_name?: string;
    };
    sender_id?: string | number;
    login?: string;
    avatar?: string | null;
    first_name?: string;
    last_name?: string;
    text?: string;
    created_at?: string;
    attachments?: MessageAttachmentDto[];
    sticker?: StickerDto | null;
}

interface SearchChatApiHit {
    chat_id: string | number;
    type: SearchChatHit['type'];
    title?: string;
    avatar?: string | null;
    avatar_url?: string | null;
    last_message_preview?: string;
    last_message_at?: string;
    unread_count?: number;
}

interface SearchMessageApiHit {
    message_id: string | number;
    chat_id: string | number;
    sender_id: string | number;
    text_preview?: string;
    created_at: string;
}

interface ChatListApiItem {
    id: string | number;
    title: string;
    type: ChatDetail['type'];
    avatar?: string | null;
    owner_id?: number;
    subscribers_count?: number;
    last_message?: BackendMessageLike;
    unread_count?: number;
    last_read_message_id?: number;
}

interface ChatCreateBody {
    id?: string | number;
    chat_id?: string | number;
}

type MessageGetPayload = MessageDto[] | {
    messages?: MessageDto[];
    has_more?: boolean;
    next_before_id?: number | null;
};

interface AttachmentUploadBody {
    attachment_url: string;
    object_key: string;
    mime_type: string;
    file_size: number;
    file_name: string;
}

type AttachmentUploadResult =
    | { success: true; attachment: MessageAttachment; outgoing: OutgoingMessageAttachment; body: AttachmentUploadBody }
    | { success: false; status: number; errorCode?: string; errorMessage: string };

function mapAttachmentDto(attachment: MessageAttachmentDto): MessageAttachment {
    return {
        id: attachment.id,
        type: attachment.type,
        url: attachment.url,
        fileName: attachment.file_name,
        mimeType: attachment.mime_type,
        fileSize: attachment.file_size,
        contactUserId: attachment.contact_user_id,
        contactFirstName: attachment.contact_first_name,
        contactLastName: attachment.contact_last_name,
        contactAvatarUrl: attachment.contact_avatar_url,
        canTranscribe: attachment.can_transcribe || subscriptionService.isPremium,
        transcript: attachment.transcript ? parseVoiceTranscript(attachment.transcript) : undefined,
        isBlur: attachment.is_blur,
    };
}

function mapStickerDto(sticker: StickerDto) {
    return {
        id: sticker.id,
        packId: sticker.pack_id,
        fileUrl: sticker.file_url,
        slug: sticker.slug,
        emoji: sticker.emoji,
        width: sticker.width,
        height: sticker.height,
    };
}

function toOutgoingAttachment(attachment: MessageAttachment): OutgoingMessageAttachment {
    if (attachment.type === 'contact') {
        return {
            type: 'contact',
            contact_user_id: attachment.contactUserId,
        };
    }

    return {
        type: attachment.type,
        url: attachment.url,
        file_name: attachment.fileName,
    };
}

function attachmentsMatch(a?: OutgoingMessageAttachment[], b?: MessageAttachmentDto[]): boolean {
    const left = a || [];
    const right = b || [];
    if (left.length !== right.length) return false;

    return left.every((item, index) => {
        const other = right[index];
        if (!other || item.type !== other.type) return false;
        if (item.type === 'contact') return item.contact_user_id === other.contact_user_id;
        return item.url === other.url;
    });
}

/**
 * @class ChatService
 * @description Сервис для управления чатами. Предоставляет методы для получения списка чатов,
 * детальной информации о чате, сообщений, а также для создания и удаления чатов.
 */
/** После стольких неудачных попыток отправки сообщение помечается «не отправлено». */
export const MAX_SEND_ATTEMPTS = 5;

export class ChatService {
    private profilesCache: Map<number, User> = new Map();
    private pendingProfiles: Map<number, Promise<User | null>> = new Map();
    private inFlightMessages = new Set<string>(); //сообщения, которые уже отправлены и ждут ответа
    private isFlushing = false; //блокировка от параллельного запуска
    private flushTimer: ReturnType<typeof setTimeout> | null = null; //дебаунс пачки триггеров flush
    /** temp_id уже сматченных эхом сообщений — чтобы отбросить повторное эхо как дубль. */
    private reconciledTempIds = new Set<string>();
    /** Колбэк: сообщение исчерпало попытки отправки. UI помечает пузырь как «не отправлено». */
    private onSendGaveUp: ((tempId: string) => void) | null = null;

    public setOnSendGaveUp(cb: ((tempId: string) => void) | null): void {
        this.onSendGaveUp = cb;
    }

    /**
     * Дебаунс-обёртка над flushQueue. На реконнекте flush дёргается сразу из трёх
     * мест (online / system.Connected / SW-сообщение) — схлопываем их в один запуск.
     * Задержка также даёт эхам уже отправленных сообщений прийти и снять их из очереди
     * ДО повторной отправки — иначе после флапа соединения сообщение шлётся дважды.
     */
    public scheduleFlush(delayMs = 400): void {
        if (this.flushTimer !== null) clearTimeout(this.flushTimer);
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flushQueue();
        }, delayMs);
    }

    /** Не сматчено ли это temp_id эхом ранее (для отбрасывания дубль-эха на приёме). */
    public wasRecentlyReconciled(tempId: string): boolean {
        return this.reconciledTempIds.has(tempId);
    }

    /** Запоминает сматченный temp_id с ограничением размера (защита от роста за сессию). */
    private rememberReconciled(tempId: string): void {
        this.reconciledTempIds.add(tempId);
        if (this.reconciledTempIds.size > 500) {
            const oldest = this.reconciledTempIds.values().next().value;
            if (oldest !== undefined) this.reconciledTempIds.delete(oldest);
        }
    }

    private stripAttachmentLabel(text: string | undefined, attachments: MessageAttachmentDto[] | undefined): string {
        const t = (text || '').trim();
        if (!t || !attachments || attachments.length === 0) return t;

        if (isNonVoiceAttachmentPlaceholderText(t)) {
            return '';
        }
        return t;
    }

    /**
     * Преобразует BackendMessage (REST) в FrontendMessage.
     * @param backendMessage - «сырой» объект сообщения из REST-ответа.
     * @param currentUserId  - ID или логин текущего пользователя для определения авторства.
     */
    private convertToFrontendMessage(backendMessage: BackendMessageLike, currentUserId?: string | number): FrontendMessage {
        const login = backendMessage.sender?.login || backendMessage.login || (backendMessage.sender_id ? `user_${backendMessage.sender_id}` : 'unknown');
        const stickerDto = backendMessage.sticker;
        
        return {
            id: backendMessage.id?.toString() || Math.random().toString(36).substring(2, 9),
            sender: { 
                id: Number(backendMessage.sender_id || backendMessage.sender?.id || 0),
                login: login, 
                avatarUrl: getFullUrl(backendMessage.sender?.avatar || backendMessage.avatar),
                firstName: backendMessage.sender?.first_name || backendMessage.first_name,
                lastName: backendMessage.sender?.last_name || backendMessage.last_name,
            },
            text: this.stripAttachmentLabel(backendMessage.text, backendMessage.attachments),
            timestamp: new Date(backendMessage.created_at || Date.now()),
            isOwn: (backendMessage.sender?.login === currentUserId) || 
                   (backendMessage.login === currentUserId) ||
                   (String(backendMessage.sender_id) === String(currentUserId)),
            attachments: backendMessage.attachments?.map(mapAttachmentDto),
            sticker: stickerDto ? mapStickerDto(stickerDto) : undefined,
        };
    }

    /**
     * Конвертирует WS-DTO сообщения (MessageDto) во фронтендную модель FrontendMessage.
     * Используется в подписчиках WebSocket для добавления новых сообщений в UI без перерисовки.
     *
     * @param dto           - DTO сообщения, полученное из WebSocket-пакета.
     * @param currentUserId - ID текущего пользователя для определения поля `isOwn`.
     * @returns {FrontendMessage} Сообщение в формате фронтенда.
     */
    public convertWsMessageDto(dto: MessageDto, currentUserId: number | string): FrontendMessage {
        const stickerDto = dto.sticker;
        return {
            id: dto.id?.toString(),
            sender: {
                id: Number(dto.sender_id),
                login: dto.login ?? `user_${dto.sender_id || 0}`,
                avatarUrl: getFullUrl(dto.avatar),
                firstName: dto.first_name,
                lastName: dto.last_name,
            },
            text: this.stripAttachmentLabel(dto.text, dto.attachments),
            timestamp: new Date(dto.created_at || Date.now()),
            isOwn: String(dto.sender_id) === String(currentUserId) || dto.login === currentUserId,
            isEdited: Boolean(dto.edited),
            status: dto.read ? 'read' : 'sent',
            attachments: dto.attachments?.map(mapAttachmentDto),
            sticker: stickerDto ? mapStickerDto(stickerDto) : undefined,
        };
    }

    /**
     * Преобразует DTO чата (ChatInformationDto) из WebSocket во фронтендную модель ChatDetail.
     * Безопасно обрабатывает отсутствие последнего сообщения.
     * 
     * @param dto           - DTO чата из WebSocket.
     * @param currentUserId - ID текущего пользователя.
     * @returns {ChatDetail} Объект чата для фронтенда.
     */
    public mapChatDtoToChat(dto: ChatInformationDto, currentUserId: number): ChatDetail {
        const commonProps = {
            id: dto.id.toString(),
            title: dto.title,
            avatarUrl: getFullUrl(dto.avatar),
            unreadCount: Number(dto.unread_count ?? 0),
            lastReadMessageId: Number(dto.last_read_message_id ?? 0),
            type: dto.chat_type as 'dialog' | 'group' | 'channel',
            owner_id: dto.owner_id,
        };

        let chat: ChatDetail;

        switch (dto.chat_type) {
            case 'dialog':
                chat = {
                    ...commonProps,
                    interlocutor: { id: 0, login: dto.title, avatarUrl: commonProps.avatarUrl },
                } as DialogChat;
                break;
            case 'group':
                chat = {
                    ...commonProps,
                    members: [],
                    owner: { id: dto.owner_id || 0, login: 'owner', avatarUrl: getFullUrl() },
                } as GroupChat;
                break;
            case 'channel':
                chat = {
                    ...commonProps,
                    subscribersCount: 0,
                } as ChannelChat;
                break;
            default:
                chat = { ...commonProps, subscribersCount: 0 } as ChannelChat;
        }

        if (dto.last_message) {
            const lastSticker = dto.last_message.sticker;
            const stickerPreview = lastSticker
                ? (lastSticker.emoji ? `${lastSticker.emoji} Стикер` : 'Стикер')
                : '';
            chat.lastMessage = {
                id: '',
                text: this.stripAttachmentLabel(
                  dto.last_message.text || stickerPreview,
                  dto.last_message.attachments,
                ),
                timestamp: new Date(dto.last_message.created_at),
                sender: { id: dto.last_message.sender_id } as User,
                isOwn: Number(dto.last_message.sender_id) === Number(currentUserId),
                attachments: dto.last_message.attachments?.map(mapAttachmentDto),
                sticker: lastSticker ? mapStickerDto(lastSticker) : undefined,
            };
        }

        return chat;
    }

    /**
     * Отправляет сообщение в текущий чат через WebSocket с offline-очередью.
     * Сначала кладёт запись в IndexedDB (persistent), затем пробует отправить через WS.
     * Если SyncManager доступен — регистрирует `flush-messages`, чтобы SW разбудил флаш при восстановлении сети.
     *
     * @param chatId   - Строковый ID чата.
     * @param text     - Текст отправляемого сообщения.
     * @param senderId - ID текущего пользователя (нужен для оптимистичной модели и дедупа).
     * @returns PendingMessage с tempId для привязки оптимистичного DOM-узла.
     */
    public async sendMessage(
        chatId: string,
        text: string,
        senderId: number,
        attachments: OutgoingMessageAttachment[] = [],
    ): Promise<PendingMessage> {
        const pending: PendingMessage = {
            tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            chatId,
            text,
            senderId,
            createdAt: Date.now(),
            attachments,
            attempts: 0,
        };

        await offlineQueue.enqueue(pending);
        if (wsClient.isConnected()) {
            pending.attempts = 1;
            await offlineQueue.enqueue(pending);
            this.inFlightMessages.add(pending.tempId);
            this.sendPendingMessage(pending);
        }

        if (!navigator.onLine && 'serviceWorker' in navigator && 'SyncManager' in window) {            
            try {
                const reg = await navigator.serviceWorker.ready;
                await (reg as ServiceWorkerRegistration & {
                    sync: { register: (tag: string) => Promise<void> };
                }).sync.register('flush-messages');
            } catch (e){
                console.warn('SyncManager failed', e);
            }
        }

        return pending;
    }

    private sendPendingMessage(message: PendingMessage): boolean {
        const attachments = message.attachments || [];
        if (attachments.length > 0) {
            return wsClient.sendIfOpen('message.SendAttachments', {
                chat_id: Number(message.chatId),
                text: message.text,
                temp_id: message.tempId,
                attachments,
            });
        }

        return wsClient.sendIfOpen('message.Send', {
            chat_id: Number(message.chatId),
            text: message.text,
            temp_id: message.tempId,
        });
    }

    public async uploadMessageAttachment(file: File, type: Extract<MessageAttachmentType, 'photo' | 'video' | 'file' | 'voice'>): Promise<AttachmentUploadResult> {
        const form = new FormData();
        form.append('file', file);

        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/messages/attachments/upload?type=${type}`, {
                method: 'POST',
                body: form,
            });

            const data = await response.json().catch(() => null);

            if (!response.ok || data?.status !== 'success' || !data?.body?.attachment_url) {
                const errorCode = data?.errors?.[0]?.code;
                const errorMessage = data?.errors?.[0]?.message || this.getUploadErrorMessage(errorCode, response.status);
                return {
                    success: false,
                    status: response.status,
                    errorCode,
                    errorMessage,
                };
            }

            const body = data.body as AttachmentUploadBody;
            const attachment: MessageAttachment = {
                type,
                url: body.attachment_url,
                fileName: body.file_name,
                mimeType: body.mime_type,
                fileSize: body.file_size,
            };

            return {
                success: true,
                body,
                attachment,
                outgoing: toOutgoingAttachment(attachment),
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                errorMessage: error instanceof Error ? error.message : 'Не удалось загрузить вложение',
            };
        }
    }

    private getUploadErrorMessage(errorCode: string | undefined, status: number): string {
        switch (errorCode) {
            case 'FILE_TOO_LARGE':
                return 'Файл превышает допустимый размер';
            case 'INVALID_FILE_FORMAT':
                return 'Этот формат файла не поддерживается';
            case 'EMPTY_FILE':
                return 'Нельзя прикрепить пустой файл';
            case 'UNAUTHORIZED':
                return 'Нужно войти в аккаунт заново';
            default:
                if (errorCode?.startsWith('CSRF_')) return 'Сессия устарела. Повторите загрузку';
                return status ? `Не удалось загрузить файл (код ${status})` : 'Не удалось загрузить файл';
        }
    }

    public async searchChats(
        query: string,
        type: '' | 'group' | 'channel' = '',
        beforeId: number | null = null,
        limit = 20,
    ): Promise<SearchChatsResult | null> {
        const q = query.trim();
        if (!q || [...q].length > 256) {
            return { items: [], nextBeforeId: null };
        }

        try {
            let url = `${BASE_URL}/api/v1/search/chats?q=${encodeURIComponent(q)}&limit=${limit}`;
            if (type) url += `&type=${type}`;
            if (beforeId) url += `&before_id=${beforeId}`;

            const response = await httpClient.request(url, { method: "GET" });
            if (!response.ok) return null;

            const data = await response.json();
            if (data.status !== 'success' || !data.body) return null;

            const items: SearchChatHit[] = (data.body.items || []).map((c: SearchChatApiHit) => ({
                chatId: String(c.chat_id),
                type: c.type,
                title: c.title || '',
                avatarUrl: getFullUrl(c.avatar_url || c.avatar || undefined),
                lastMessagePreview: c.last_message_preview ?? undefined,
                lastMessageAt: c.last_message_at ? new Date(c.last_message_at) : undefined,
                unreadCount: Number(c.unread_count ?? 0),
            }));

            const nextBeforeId = data.body.next_before_id ? Number(data.body.next_before_id) : null;
            return { items, nextBeforeId };
        } catch (e) {
            return null;
        }
    };

    /**
     * Отправляет команду для редактирования чообщения через WebSocket.
     * Сервер обработает и разошлёт всем участникам чата broadcast `message.Edited`.
     * 
     * @param messageId 
     * @param newText 
     * @returns 
     */
    public editMessage(chatId: string, messageId: string, text: string): boolean {
        if (!wsClient.isConnected()) return false;
        return wsClient.sendIfOpen('message.Edit', {
            chat_id: Number(chatId),
            message_id: Number(messageId),
            text: text,
        });
    };

    public deleteMessage(chatId: string, messageId: string): boolean {
        if (!wsClient.isConnected()) return false;
        return wsClient.sendIfOpen('message.Delete', {
            chat_id: Number(chatId),
            message_id: Number(messageId),
        });
    };

    /**
     * Отмечает сообщение как прочитанное. Курсор сервера двигается только вперёд.
     */
    public markMessageRead(chatId: string, messageId: string): boolean {
        if (!wsClient.isConnected()) return false;
        return wsClient.sendIfOpen('message.MarkRead', {
            chat_id: Number(chatId),
            message_id: Number(messageId),
        });
    }

    /**
     * Пере-проталкивает все pending-сообщения в WebSocket.
     * Вызывается при `online`, `system.Connected` и сообщении от SW.
     * Элементы удаляются не здесь, а при приходе серверного broadcast `message.New` (см. resolveServerMessage).
     */
    public async flushQueue(): Promise<void> {
        if (this.isFlushing) return;

        if (!wsClient.isConnected()) return;

        this.isFlushing = true;

        try {
            const pending = await offlineQueue.getAll();
            for (const m of pending) {

                if (this.inFlightMessages.has(m.tempId)) continue;

                // Лимит попыток: сообщение, которое не подтвердилось эхом за N отправок,
                // больше не дослыаем — помечаем как «не отправлено», ждём ручного retry.
                if ((m.attempts ?? 0) >= MAX_SEND_ATTEMPTS) {
                    this.onSendGaveUp?.(m.tempId);
                    continue;
                }

                // Claim синхронно — чтобы параллельный flush пропустил это сообщение.
                this.inFlightMessages.add(m.tempId);

                // За время await'ов предыдущих итераций сообщение могло быть снято эхом
                // (reconcile удаляет его из очереди). Не воскрешаем его повторным enqueue.
                const fresh = await offlineQueue.get(m.tempId);
                if (!fresh) {
                    this.inFlightMessages.delete(m.tempId);
                    continue;
                }

                fresh.attempts = (fresh.attempts ?? 0) + 1;
                await offlineQueue.enqueue(fresh);

                const sent = this.sendPendingMessage(fresh);

                // Если внезапно сокет закрылся во время цикла
                if (!sent) {
                    this.inFlightMessages.delete(fresh.tempId);
                    break;
                }
            }
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Ручная переотправка сообщения, помеченного «не отправлено»:
     * сбрасывает счётчик попыток и заново прогоняет очередь.
     */
    public async retryMessage(tempId: string): Promise<void> {
        const all = await offlineQueue.getAll();
        const m = all.find((x) => x.tempId === tempId);
        if (!m) return;

        m.attempts = 0;
        await offlineQueue.enqueue(m);
        this.inFlightMessages.delete(tempId);
        await this.flushQueue();
    }

    /**
     * Сопоставляет пришедшее от сервера сообщение с оптимистичным из очереди.
     * Если совпадение найдено — удаляет запись из IndexedDB и возвращает её tempId
     * (UI должен заменить DOM-узел вместо добавления дубликата).
     */
    private unescapeHtml(text: string): string {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#34;/g, '"')
            .replace(/&#39;/g, "'");
    }

    public async resolveServerMessage(dto: MessageDto, currentUserId: number): Promise<string | null> {
        if (dto.sender_id !== currentUserId) return null;

        const pending = await offlineQueue.getByChat(dto.chat_id.toString());

        // Основной путь: бэк эхом возвращает наш temp_id — сверяем по id.
        // Надёжно даже когда сервер переписал контент (цензура мата, is_blur).
        if (dto.temp_id) {
            const byId = pending.find((m) => m.tempId === dto.temp_id);
            if (!byId) return null;
            await offlineQueue.remove(byId.tempId);
            this.inFlightMessages.delete(byId.tempId);
            this.rememberReconciled(byId.tempId);
            return byId.tempId;
        }

        // Фолбэк для записей без temp_id (например, отправленных до обновления): по содержимому.
        const unescapedText = this.unescapeHtml(dto.text ?? '');
        const dtoAttachments = dto.attachments || [];
        const match = pending.find((m) => {
            const hasAttachments = (m.attachments || []).length > 0;
            if (m.text !== unescapedText && !(hasAttachments && m.text === '')) return false;
            return attachmentsMatch(m.attachments, dtoAttachments);
        });

        if (!match) return null;

        await offlineQueue.remove(match.tempId);
        this.inFlightMessages.delete(match.tempId);

        return match.tempId;
    }

    public async rejectPendingMessageFromError(error: WsErrorDto, activeChatId?: string | null): Promise<string | null> {
        const exactTempId = error.temp_id || error.tempId || error.client_temp_id;
        if (exactTempId) {
            await offlineQueue.remove(exactTempId);
            this.inFlightMessages.delete(exactTempId);
            return exactTempId;
        }

        const chatId = error.chat_id !== undefined ? String(error.chat_id) : activeChatId;
        if (!chatId) return null;

        const pending = await offlineQueue.getByChat(chatId);
        const match = pending
            .slice()
            .reverse()
            .find(message => this.inFlightMessages.has(message.tempId));

        if (!match) return null;

        await offlineQueue.remove(match.tempId);
        this.inFlightMessages.delete(match.tempId);
        return match.tempId;
    }

    /**
     * Вызывать при обрыве соединения, чтобы сбросить In-Flight статус.
     * Иначе при реконнекте flushQueue проигнорирует сообщения, думая, что они все еще летят.
     */
    public clearInFlight(): void {
        this.inFlightMessages.clear();
    }

    /**
     * Получает список чатов пользователя.
     */
    public async getChats(currentUserId?: string | number): Promise<ChatDetail[]> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                console.error(`Ошибка при получении списка чатов: ${response.status}`);
                return [];
            }

            const data = await response.json();
            
            if (data.status !== 'success' || !data.body) {
                return [];
            }

            const frontendChats: ChatDetail[] = data.body.map((chat: ChatListApiItem) => {
                let frontendChat: ChatDetail;

                const commonProps = {
                    id: chat.id.toString(),
                    title: chat.title,
                    type: chat.type,
                    avatarUrl: getFullUrl(chat.avatar),
                    unreadCount: Number(chat.unread_count ?? 0),
                    lastReadMessageId: Number(chat.last_read_message_id ?? 0),
                    owner_id: chat.owner_id,
                };

                switch (chat.type) {
                    case 'dialog':
                        frontendChat = {
                            ...commonProps,
                            interlocutor: { 
                                id: 0, 
                                login: chat.title, 
                                avatarUrl: chat.avatar || '/assets/images/avatars/defaultAvatar.svg' 
                            }, 
                        } as DialogChat;
                        break;
                    case 'group':
                        frontendChat = {
                            ...commonProps,
                            members: [], // Пока бек не отдает список участников
                            owner: { id: chat.owner_id || 0, login: 'owner', avatarUrl: getFullUrl() },
                        } as GroupChat;
                        break;
                    case 'channel':
                        frontendChat = {
                            ...commonProps,
                            subscribersCount: chat.subscribers_count || 0 
                        } as ChannelChat;
                        break;
                    default:
                        frontendChat = { ...commonProps, subscribersCount: 0 } as ChannelChat;
                }

                // Бэкенд может прислать пустую заглушку (zero-value) для нового чата, где id = 0 или объект пуст
                if (chat.last_message && chat.last_message.id !== 0 && (chat.last_message.id !== undefined || chat.last_message.created_at)) {
                    frontendChat.lastMessage = this.convertToFrontendMessage(chat.last_message, currentUserId);
                }
                
                return frontendChat;
            });
            
            return frontendChats;
        } catch (error) {
            console.error("Ошибка сети или сервера при получении чатов:", error);
            return [];
        }
    }

    /**
     * Получает детальную информацию о конкретном чате.
     */
    public async getChatDetail(chatId: string): Promise<ChatDetail | undefined> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}`, {
                method: 'GET'
            });

            if (!response.ok) {
                console.error(`Ошибка при получении деталей чата: ${response.status}`);
                return undefined;
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.body) {
                const chat = data.body;
                
                const commonProps = {
                    id: chat.id.toString(),
                    title: chat.title,
                    type: chat.type,
                    avatarUrl: getFullUrl(chat.avatar),
                    unreadCount: 0,
                    owner_id: chat.owner_id
                };

                switch (chat.type) {
                    case 'dialog':
                        return {
                            ...commonProps,
                            interlocutor: {
                                id: 0,
                                login: chat.title,
                                avatarUrl: commonProps.avatarUrl
                            }
                        } as DialogChat;

                    case 'group':
                        return {
                            ...commonProps,
                            members: [],
                            owner: { id: chat.owner_id || 0, login: 'owner', avatarUrl: getFullUrl() },
                        } as GroupChat;

                    case 'channel':
                        return {
                            ...commonProps,
                            subscribersCount: chat.subscribers_count || 0,
                            description: chat.description ?? ''
                        } as ChannelChat;

                    default:
                        console.error(`ChatService: неизвестный тип чата ${chat.type}`);
                        return undefined;
                }
            }
            
            return undefined;
        } catch (error) {
            console.error("Ошибка сети при получении деталей чата:", error);
            return undefined;
        }
    }

    /**
     * Получает список сообщений для конкретного чата через WebSocket (паттерн Request-Response).
     * Отправляет запрос "message.Receive" и ждёт ответа "message.Get".
     * 
     * @param chatId - ID чата.
     * @param currentUserId - ID текущего пользователя.
     * @param beforeId - ID сообщения, до которого загружать историю (для пагинации).
     * @returns {Promise<{ messages: FrontendMessage[], hasMore: boolean, nextBeforeId: number | null } | null>} Промис с объектом данных или null при таймауте.
     */
    public async getMessages(chatId: string, currentUserId: number, beforeId: number | null = null): Promise<{ messages: FrontendMessage[], hasMore: boolean, nextBeforeId: number | null } | null> {
        return new Promise((resolve) => {
            const timeoutMs = 5000;
            
            const handleGetMessages = (payload: MessageGetPayload) => {
                clearTimeout(timeout);
                wsClient.unsubscribe('message.Get', handleGetMessages);
                
                // Бэкенд возвращает объект { messages: MessageDto[], has_more: boolean, next_before_id: number }
                const messagesArray = Array.isArray(payload) ? payload : payload.messages;

                if (Array.isArray(messagesArray)) {
                    const messages = messagesArray.map((msg: MessageDto) => 
                        this.convertWsMessageDto(msg, currentUserId)
                    ).reverse();
                    
                    resolve({ 
                        messages, 
                        hasMore: Array.isArray(payload) ? false : payload.has_more || false,
                        nextBeforeId: Array.isArray(payload) ? null : payload.next_before_id || null
                    });
                } else {
                    resolve({ messages: [], hasMore: false, nextBeforeId: null });
                }
            };

            wsClient.subscribe('message.Get', handleGetMessages);

            wsClient.send('message.Receive', { 
                chat_id: Number(chatId),
                limit: 50,
                before_id: beforeId 
            });

            const timeout = setTimeout(() => {
                wsClient.unsubscribe('message.Get', handleGetMessages);
                console.warn(`getMessages: Таймаут ожидания ответа от сервера для чата ${chatId}`);
                // Возвращаем null вместо пустой истории, чтобы фронт понял, что это ошибка
                resolve(null);
            }, timeoutMs);
        });
    }

    /**
     * Создает новый чат (Диалог или Группу).
     * @param members_id - Список ID участников.
     * @param type - Тип чата.
     * @param title - Заголовок чата (необязательно).
     * @returns Объект с результатом операции: флаг успеха, HTTP статус и тело ответа.
     */
    public async createChat(members_id: number[], type: "dialog" | "group" | "channel", title?: string): Promise<{ success: boolean; status: number; body?: ChatCreateBody }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    members_id: members_id,
                    title: title,
                    type: type
                })
            });

            let body: ChatCreateBody | undefined;
            if (response.ok || response.status === 409) {
                try {
                    const data = await response.json();
                    if (data.status === 'success') {
                        body = data.body;
                    }
                } catch (e) {
                    console.error("ChatService: ошибка парсинга JSON", e);
                }
            }

            return { 
                success: response.ok, 
                status: response.status, 
                body: body 
            };
        } catch (error) {
            console.error("Ошибка сети при создании чата:", error);
            return { success: false, status: 500 };
        }
    }

    /**
     * Удаляет чат.
     */
    public async deleteChat(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode: string | undefined;
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }

            return { success: false, status: response.status, errorCode };
        } catch (error) {
            console.error("Ошибка сети при удалении чата:", error);
            return { success: false, status: 500 };
        }
    }

    public async leaveChat(chatId: number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/quit`, {
                method: 'DELETE',
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode = '';
            let errorMessage = '';
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                    errorMessage = data.errors[0].message;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }

            return { success: false, status: response.status, errorCode, errorMessage };
        } catch (error) {
            console.error("ChatService: ошибка при выходе из чата:", error);
            return { success: false, status: 500 };
        }
    }

    public async joinChat(chatId: string | number): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/join`, {
                method: 'POST',
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode = '';
            let errorMessage = '';
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                    errorMessage = data.errors[0].message;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }

            return { success: false, status: response.status, errorCode, errorMessage };
        } catch (error) {
            console.error("ChatService: ошибка при вступлении в чат:", error);
            return { success: false, status: 500 };
        }
    }

    /**
     * @deprecated Используйте leaveChat
     */
    public async leaveGroup(chatId: string): Promise<{ success: boolean; status: number; errorCode?: string; errorMessage?: string }> {
        return this.leaveChat(Number(chatId));
    }

    /**
     * Обновляет название группового чата.
     * @param chatId — Идентификатор чата.
     * @param title — Новое название (макс. 100 символов, не пустое).
     * @returns true, если запрос завершился успешно.
     */
    public async updateChatTitle(chatId: string, title: string): Promise<boolean> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/title`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });

            if (!response.ok) {
                console.error(`Ошибка при обновлении названия чата: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Ошибка сети при обновлении названия чата:', error);
            return false;
        }
    }

    public async updateChatDescription(chatId: string, description: string): Promise<boolean> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/description`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description })
            });

            if (!response.ok) {
                console.error(`Ошибка при обновлении описания чата: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Ошибка сети при обновлении описания чата:', error);
            return false;
        }
    }

    /**
     * Добавляет участников в групповой чат.
     * @param chatId — Идентификатор чата.
     * @param userIds — Массив ID пользователей для добавления (не пустой, без дубликатов).
     * @returns true, если запрос завершился успешно.
     */
    public async addMembersToChat(chatId: string, userIds: number[]): Promise<{ success: boolean; status: number; errorCode?: string }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ members_id: userIds })
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            let errorCode: string | undefined;
            try {
                const data = await response.json();
                if (data.status === 'error' && data.errors && data.errors.length > 0) {
                    errorCode = data.errors[0].code;
                }
            } catch (e) {
                // Игнорируем ошибки парсинг а
            }

            return { success: false, status: response.status, errorCode };
        } catch (error) {
            console.error('Ошибка сети при добавлении участников:', error);
            return { success: false, status: 500 };
        }
    }

    /**
     * Обновляет аватарку группового чата.
     * Использует FormData — заголовок Content-Type НЕ указывается вручную,
     * чтобы браузер корректно проставил multipart/form-data с boundary.
     * @param chatId — Идентификатор чата.
     * @param file — Файл изображения (макс. 5 МБ; допустимые типы: jpeg, jpg, png, webp, gif).
     * @returns true, если запрос завершился успешно.
     */
    public async updateChatAvatar(chatId: string, file: File): Promise<boolean> {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/avatar`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                console.error(`Ошибка при обновлении аватарки чата: ${response.status}`);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Ошибка сети при обновлении аватарки:', error);
            return false;
        }
    }

    // TODO: удалить, когда бэк начнёт возвращать chat_id в ответе на 409
    public async findExistingDialogChatId(targetId: number, targetLogin?: string): Promise<string | undefined> {
        const chats = await this.getChats();
        const dialogs = chats.filter(c => c.type === 'dialog');

        if (targetLogin) {
            const byLogin = dialogs.find(c => c.type === 'dialog' && c.interlocutor?.login === targetLogin);
            if (byLogin) return byLogin.id;
        }

        for (const d of dialogs) {
            const members = await this.getChatMembers(d.id);
            if (members.includes(targetId)) return d.id;
        }

        return undefined;
    }

    /**
     * Получает список ID всех участников чата.
     * @param chatId — Идентификатор чата.
     * @returns Массив ID участников.
     */
    public async getChatMembers(chatId: string): Promise<number[]> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members`, {
                method: 'GET'
            });

            if (!response.ok) {
                console.error(`Ошибка при получении участников чата: ${response.status}`);
                return [];
            }

            const data = await response.json();
            if (data.status === 'success' && data.body && Array.isArray(data.body.members_id)) {
                return data.body.members_id;
            }
            return [];
        } catch (error) {
            console.error('Ошибка сети при получении участников чата:', error);
            return [];
        }
    }

    /**
     * Удаляет участника из группового чата.
     * @param chatId — Идентификатор чата.
     * @param userId — ID пользователя для удаления.
     * @returns Объект с флагом успеха и HTTP-статусом.
     */
    public async removeMember(chatId: string, userId: number): Promise<{ success: boolean; status: number }> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/chats/${chatId}/members/${userId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                return { success: true, status: response.status };
            }

            console.error(`Ошибка при удалении участника: ${response.status}`);
            return { success: false, status: response.status };
        } catch (error) {
            console.error('Ошибка сети при удалении участника:', error);
            return { success: false, status: 500 };
        }
    }

    /**
     * Получает профиль пользователя по его ID. Использует внутренний кэш и дедупликацию запросов.
     * @param userId - Числовой ID пользователя.
     * @returns {Promise<User | null>} Объект пользователя или null в случае ошибки.
     */
    public async getUserProfile(userId: number): Promise<User | null> {
        if (this.profilesCache.has(userId)) {
            return this.profilesCache.get(userId)!;
        }

        if (this.pendingProfiles.has(userId)) {
            return this.pendingProfiles.get(userId)!;
        }

        const profilePromise = (async () => {
            try {
                const response = await httpClient.request(`${BASE_URL}/api/v1/profiles/${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) return null;

                const data = await response.json();
                if (data.status === 'success' && data.body) {
                    const profile = data.body;
                    const user: User = {
                        id: userId,
                        login: profile.login,
                        avatarUrl: getFullUrl(profile.avatar),
                        firstName: profile.first_name,
                        lastName: profile.last_name
                    };

                    // заполняем presence-кэш из профиля
                    presenceService.seed(userId, {
                        isOnline: Boolean(profile.is_online),
                        lastSeenAt: profile.last_seen ? new Date(profile.last_seen) : undefined,
                    });
                    this.profilesCache.set(userId, user);
                    return user;
                }
                return null;
            } catch (error) {
                return null;
            } finally {
                this.pendingProfiles.delete(userId);
            }
        })();

        this.pendingProfiles.set(userId, profilePromise);
        return profilePromise;
    }

    public async searchMessages(
        chatId: string,
        query: string,
        beforeId: number | null = null,
        limit = 20,
    ): Promise<SearchMessagesResult | null> {
        const q = query.trim();
        if (!q || [...q].length > 256) {
            return { items: [], nextBeforeId: null };
        }

        try {
            let url = `${BASE_URL}/api/v1/search/messages?chat_id=${chatId}&q=${encodeURIComponent(q)}&limit=${limit}`;
            if (beforeId) url += `&before_id=${beforeId}`;

            const response = await httpClient.request(url, { method: 'GET' });
            if (!response.ok) return null;

            const data = await response.json();
            if (data.status !== 'success' || !data.body) return null;

            const items: SearchMessageHit[] = (data.body.items || []).map((m: SearchMessageApiHit) => ({
                messageId: String(m.message_id),
                chatId: String(m.chat_id),
                senderId: Number(m.sender_id),
                textPreview: m.text_preview || '',
                createdAt: new Date(m.created_at),
            }));

            const nextBeforeId = data.body.next_before_id ? Number(data.body.next_before_id) : null;
            return { items, nextBeforeId };
        } catch {
            return null;
        }
    }
}

export const chatService = new ChatService();
