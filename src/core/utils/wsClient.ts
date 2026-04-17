/**
 * @file Менеджер WebSocket-соединения для приложения.
 * @module core/utils/wsClient
 */

const hostname = window.location.hostname;
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

const WS_BASE_URL = `${protocol}://${hostname}`;
const WS_PATH = '/api/v1/ws';

/**
 * @interface WsPacket
 * @description Унифицированный формат пакета для отправки и получения по WebSocket.
 * @property {string} type    - Тип события, например «message.New» или «message.Get».
 * @property {unknown} payload - Произвольная полезная нагрузка.
 */
export interface WsPacket {
    type: string;
    payload: unknown;
}

/**
 * @interface MessageDto
 * @description DTO входящего сообщения от бэкенда.
 * @property {number} id         - Числовой ID сообщения.
 * @property {number} chat_id    - ID чата, к которому относится сообщение.
 * @property {number} sender_id  - ID отправителя.
 * @property {string} text       - Текст сообщения.
 * @property {string} created_at - ISO-строка даты создания.
 * @property {string} [login]      - Логин отправителя.
 * @property {string} [first_name] - Имя отправителя.
 * @property {string} [last_name]  - Фамилия отправителя.
 */
export interface MessageDto {
    id: number;
    chat_id: number;
    sender_id: number;
    text: string;
    created_at: string;
    login?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string | null;
}

/**
 * @interface ChatInformationDto
 * @description Данные о чате, приходящие через WebSocket.
 * @property {MessageDto | null} last_message - Последнее сообщение в чате.
 * @property {string} title                   - Название чата.
 * @property {string} chat_type               - Тип чата (dialog, group, channel).
 * @property {string | null} [avatar]         - URL аватара чата.
 * @property {number} id                      - ID чата.
 */
export interface ChatInformationDto {
    last_message: MessageDto | null;
    title: string;
    chat_type: string;
    avatar?: string | null;
    id: number;
}

/**
 * @description Тип коллбэка-подписчика на WS-событие.
 */
type WsEventCallback<T = any> = (payload: T) => void;

/**
 * @class WebSocketClient
 * @description Singleton-менеджер WebSocket-соединения.
 *
 * Ответственности:
 * - Устанавливает и поддерживает соединение с сервером (Global Hub).
 * - Реализует простую Pub/Sub-систему для подписки UI на конкретные типы событий.
 * - Автоматически переподключается при разрыве соединения.
 */
class WebSocketClient {
    /** Единственный экземпляр класса (паттерн Singleton). */
    private static instance: WebSocketClient;

    /** Активное WebSocket-соединение. */
    private socket: WebSocket | null = null;

    /**
     * Словарь подписчиков: ключ — тип события WS, значение — Set коллбэков.
     */
    private subscribers: Map<string, Set<WsEventCallback<any>>> = new Map();

    /** Флаг намеренного закрытия. */
    private intentionallyClosed = false;

    /** Счётчик попыток переподключения. */
    private reconnectAttempts = 0;

    /** Максимальная задержка между попытками переподключения в мс. */
    private readonly MAX_RECONNECT_DELAY_MS = 30_000;

    /** Базовая задержка переподключения в мс. */
    private readonly BASE_RECONNECT_DELAY_MS = 1_000;

    /** ID таймера переподключения. */
    private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;

    /** Очередь пакетов на отправку (на случай, если сокет еще не открыт). */
    private sendQueue: WsPacket[] = [];

    private constructor() {}

    /**
     * Возвращает единственный экземпляр класса.
     * @returns {WebSocketClient} Singleton-экземпляр.
     */
    public static getInstance(): WebSocketClient {
        if (!WebSocketClient.instance) {
            WebSocketClient.instance = new WebSocketClient();
        }
        return WebSocketClient.instance;
    }

    /**
     * Устанавливает WebSocket-соединение с глобальным хабом.
     */
    public connect(): void {
        const isAlive =
            this.socket !== null &&
            (this.socket.readyState === WebSocket.OPEN ||
                this.socket.readyState === WebSocket.CONNECTING);

        if (isAlive) {
            return;
        }

        if (this.socket) {
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onerror = null;
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }

        this.intentionallyClosed = false;

        const url = `${WS_BASE_URL}${WS_PATH}`;

        try {
            this.socket = new WebSocket(url);
        } catch (err) {
            this.scheduleReconnect();
            return;
        }

        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onerror = this.handleError.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
    }

    /**
     * Закрывает WebSocket-соединение намеренно.
     */
    public disconnect(): void {
        this.intentionallyClosed = true;
        this.clearReconnectTimer();

        if (this.socket) {
            // Отвязываем события перед закрытием, чтобы избежать фантомных вызовов handleClose
            this.socket.onopen = null;
            this.socket.onmessage = null;
            this.socket.onerror = null;
            this.socket.onclose = null;
            this.socket.close();
        }

        this.socket = null;
    }
    
/**
     * Проверяет, открыт ли сокет прямо сейчас.
     */
    public isConnected(): boolean {
        return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
    }

    /**
     * Отправляет сообщение только если сокет открыт. 
     * НЕ кладет в sendQueue (т.к. за очередь отвечает OfflineMessageQueue).
     */
    public sendIfOpen(type: string, payload: any): boolean {
        if (this.isConnected()) {
            this.socket!.send(JSON.stringify({ type, payload }));
            return true;
        }
        return false;
    }

    /**
     * Формирует и отправляет пакет на сервер.
     * @param {string}  type    - Тип события (например, «message.Send»).
     * @param {unknown} payload - Полезная нагрузка.
     */
    public send(type: string, payload: unknown): void {
        const packet: WsPacket = { type, payload };

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            this.sendQueue.push(packet);
            return;
        }

        this.socket.send(JSON.stringify(packet));
    }

    /**
     * Подписывает коллбэк на события определённого типа.
     */
    public subscribe<T = any>(eventType: string, callback: WsEventCallback<T>): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType)!.add(callback);
    }

    /**
     * Отписывает ранее зарегистрированный коллбэк.
     */
    public unsubscribe<T = any>(eventType: string, callback: WsEventCallback<T>): void {
        this.subscribers.get(eventType)?.delete(callback);
    }

    /**
     * Вызывается при успешном открытии соединения.
     */
    private handleOpen(): void {
        this.reconnectAttempts = 0;

        // Отправляем накопившиеся пакеты
        while (this.sendQueue.length > 0) {
            const packet = this.sendQueue.shift();
            if (packet) {
                this.socket?.send(JSON.stringify(packet));
            }
        }

        const handlers = this.subscribers.get('system.Connected');
        if (handlers && handlers.size > 0) {
            handlers.forEach(cb => {
                try {
                    cb(null);
                } catch (e) {
                    console.error('[WS] Ошибка в обработчике system.Connected:', e);
                }
            });
        }
    }

    /**
     * Вызывается при получении сообщения от сервера.
     */
    private handleMessage(event: MessageEvent): void {
        let packet: WsPacket;

        try {
            packet = JSON.parse(event.data as string) as WsPacket;
        } catch {
            console.error('[WS] Ошибка парсинга входящего пакета:', event.data);
            return;
        }

        const handlers = this.subscribers.get(packet.type);
        if (handlers && handlers.size > 0) {
            handlers.forEach(cb => {
                try {
                    cb(packet.payload);
                } catch (err) {
                    console.error(`[WS] Ошибка в обработчике события «${packet.type}»:`, err);
                }
            });
        }
    }

    /**
     * Вызывается при ошибке WebSocket-соединения.
     */
    private handleError(event: Event): void {
        console.error('[WS] Ошибка соединения:', event);
    }

    /**
     * Вызывается при закрытии соединения.
     */
    private handleClose(event: CloseEvent): void {
        this.socket = null;

        if (!this.intentionallyClosed) {
            this.scheduleReconnect();
        }
    }

    /**
     * Планирует следующую попытку переподключения.
     */
    private scheduleReconnect(): void {
        this.clearReconnectTimer();

        const delay = Math.min(
            this.BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
            this.MAX_RECONNECT_DELAY_MS,
        );

        this.reconnectTimerId = setTimeout(() => {
            this.reconnectAttempts += 1;
            this.connect();
        }, delay);
    }

    /**
     * Очищает таймер реконнекта.
     */
    private clearReconnectTimer(): void {
        if (this.reconnectTimerId !== null) {
            clearTimeout(this.reconnectTimerId);
            this.reconnectTimerId = null;
        }
    }
}

/**
 * Синглтон-экземпляр WebSocket-клиента.
 */
export const wsClient = WebSocketClient.getInstance();
