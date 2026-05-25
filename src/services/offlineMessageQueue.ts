import type { OutgoingMessageAttachment } from "../types/chat";

/**
 * @file Persistent-очередь исходящих сообщений на IndexedDB.
 * @module services/offlineMessageQueue
 */

export interface PendingMessage {
    tempId: string;
    chatId: string;
    text: string;
    senderId: number;
    createdAt: number;
    attachments?: OutgoingMessageAttachment[];
}

const DB_NAME = 'asap-offline-queue';
const DB_VERSION = 3;
const STORE_NAME = 'pending-messages';

class OfflineMessageQueue {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDb(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = this.tryOpen().catch(async (err) => {
            console.warn('offlineQueue: re-creating IndexedDB after error', err);
            await this.deleteDb().catch(() => {});
            return this.tryOpen();
        });

        return this.dbPromise;
    }

    private tryOpen(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = request.result;
                const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

                if (oldVersion < 1) {
                    // Версия 1: создаём store и индексы
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'tempId' });
                    store.createIndex('chatId', 'chatId', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Версия 2: добавлено optional-поле `attachments` в PendingMessage.
                // IndexedDB хранит записи как есть (schema-less), поэтому изменений
                // структуры objectStore не требуется — старые записи без attachments
                // продолжают читаться корректно.
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error('IndexedDB open blocked'));
        });
    }

    private deleteDb(): Promise<void> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(DB_NAME);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => resolve();
        });
    }

    private async tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
        const db = await this.openDb();
        return new Promise<T>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, mode);
            const store = transaction.objectStore(STORE_NAME);
            const result = fn(store);

            if (result instanceof IDBRequest) {
                result.onsuccess = () => resolve(result.result as T);
                result.onerror = () => reject(result.error);
            } else {
                Promise.resolve(result).then(resolve, reject);
            }

            transaction.onerror = () => reject(transaction.error);
        });
    }

    public async enqueue(msg: PendingMessage): Promise<void> {
        await this.tx('readwrite', (store) => store.put(msg));
    }

    public async remove(tempId: string): Promise<void> {
        await this.tx('readwrite', (store) => store.delete(tempId));
    }

    public async getAll(): Promise<PendingMessage[]> {
        const all = await this.tx<PendingMessage[]>('readonly', (store) => store.getAll());
        return all.slice().sort((a, b) => a.createdAt - b.createdAt);
    }

    public async getByChat(chatId: string): Promise<PendingMessage[]> {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('chatId');
            const request = index.getAll(chatId);

            request.onsuccess = () => {
                const items = (request.result as PendingMessage[]).slice()
                    .sort((a, b) => a.createdAt - b.createdAt);
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    }

    public async count(): Promise<number> {
        return this.tx<number>('readonly', (store) => store.count());
    }
}

export const offlineQueue = new OfflineMessageQueue();
