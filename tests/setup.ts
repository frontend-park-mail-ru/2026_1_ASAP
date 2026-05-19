import { afterEach, vi } from 'vitest';

declare global {
    var __LOCAL_API__: boolean;
}

(globalThis as typeof globalThis & { __LOCAL_API__: boolean }).__LOCAL_API__ = false;

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    try {
        localStorage.clear();
    } catch {}
});
