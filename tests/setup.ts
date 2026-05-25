import { afterEach, vi } from 'vitest';

declare global {
    var __LOCAL_API__: boolean;
}

(globalThis as typeof globalThis & { __LOCAL_API__: boolean }).__LOCAL_API__ = false;

const localStorageMock = (() => {
    let store = new Map<string, string>();

    return {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, String(value));
        }),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        clear: vi.fn(() => {
            store = new Map<string, string>();
        }),
        key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
        get length() {
            return store.size;
        },
    } satisfies Storage;
})();

vi.stubGlobal('localStorage', localStorageMock);

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', localStorageMock);
    try {
        localStorage.clear();
    } catch {}
});
