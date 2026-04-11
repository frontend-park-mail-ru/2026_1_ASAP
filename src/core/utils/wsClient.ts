/**
 * @file Менеджер WebSocket-соединения для приложения.
 * @module core/utils/wsClient
 */

const hostname = window.location.hostname;
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

const WS_BASE_URL = `${protocol}://${hostname}:8080`;
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
 * @description DTO входящего сообщения от бэкенда (payload для «message.New»).
 * @property {number} id         - Числовой ID сообщения.
 * @property {number} chat_id    - ID чата, к которому относится сообщение.
 * @property {number} sender_id  - ID отправителя.
 * @property {string} text       - Текст сообщения.
 * @property {string} created_at - ISO-строка даты создания.
 * @property {string} [login]    - Логин отправителя (если бэкенд возвращает).
 */
export interface MessageDto {
    id: number;
    chat_id: number;
    sender_id: number;
    text: string;
    created_at: string;
    login?: string;
}

/**
 * @typedef WsEventCallback
 * @description Тип коллбэка-подписчика на WS-событие.
 */
type WsEventCallback = (payload: MessageDto) => void;

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
    private subscribers: Map<string, Set<WsEventCallback>> = new Map();

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
            // Уже подключены или в процессе подключения к хабу
            return;
        }

        this.intentionallyClosed = false;

        const url = `${WS_BASE_URL}${WS_PATH}`;
        console.log(`[WS] Подключение к глобальному хабу ${url}...`);

        try {
            this.socket = new WebSocket(url);
        } catch (err) {
            console.error('[WS] Не удалось создать WebSocket:', err);
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
        this.socket?.close();
        this.socket = null;
        console.log('[WS] Соединение закрыто намеренно.');
    }

    /**
     * Формирует и отправляет пакет на сервер.
     * @param {string}  type    - Тип события (например, «message.Send»).
     * @param {unknown} payload - Полезная нагрузка.
     */
    public send(type: string, payload: unknown): void {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Попытка отправки при закрытом соединении. Пакет отброшен:', { type, payload });
            return;
        }

        const packet: WsPacket = { type, payload };
        this.socket.send(JSON.stringify(packet));
    }

    /**
     * Подписывает коллбэк на события определённого типа.
     */
    public subscribe(eventType: string, callback: WsEventCallback): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType)!.add(callback);
    }

    /**
     * Отписывает ранее зарегистрированный коллбэк.
     */
    public unsubscribe(eventType: string, callback: WsEventCallback): void {
        this.subscribers.get(eventType)?.delete(callback);
    }

    /**
     * Вызывается при успешном открытии соединения.
     */
    private handleOpen(): void {
        console.log('[WS] Соединение установлено.');
        this.reconnectAttempts = 0;
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
                    cb(packet.payload as MessageDto);
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
        console.warn(`[WS] Соединение закрыто. Код: ${event.code}, причина: ${event.reason || 'не указана'}.`);
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

        console.log(`[WS] Повторное подключение через ${delay / 1000} с...`);

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
