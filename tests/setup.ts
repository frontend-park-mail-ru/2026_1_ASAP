import { afterEach, vi } from 'vitest';

declare global {
    // eslint-disable-next-line no-var
    var __LOCAL_API__: boolean;
}

(globalThis as any).__LOCAL_API__ = false;

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
    try {
        localStorage.clear();
    } catch {}
});
