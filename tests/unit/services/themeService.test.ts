import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadThemeService() {
    vi.resetModules();
    return import('../../../src/services/themeService');
}

function stubLocalStorage() {
    const store = new Map<string, string>();
    const storage = {
        get length() {
            return store.size;
        },
        clear: vi.fn(() => {
            store.clear();
        }),
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
        removeItem: vi.fn((key: string) => {
            store.delete(key);
        }),
        setItem: vi.fn((key: string, value: string) => {
            store.set(key, String(value));
        }),
    } satisfies Storage;

    vi.stubGlobal('localStorage', storage);
}

function stubSystemLightTheme() {
    const matchMedia = vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    } satisfies MediaQueryList);

    vi.stubGlobal('matchMedia', matchMedia);

    return matchMedia;
}

describe('themeService', () => {
    beforeEach(() => {
        stubLocalStorage();
        delete document.documentElement.dataset.theme;
    });

    it('без сохранённого выбора применяет тёмную тему, даже если системная тема светлая', async () => {
        const matchMedia = stubSystemLightTheme();
        const { themeService } = await loadThemeService();

        themeService.init();

        expect(themeService.get()).toBe('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(matchMedia).not.toHaveBeenCalled();
    });

    it('применяет сохранённую светлую тему пользователя', async () => {
        localStorage.setItem('theme', 'light');
        const { themeService } = await loadThemeService();

        themeService.init();

        expect(themeService.get()).toBe('light');
        expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('toggle сохраняет явный выбор пользователя', async () => {
        const { themeService } = await loadThemeService();
        themeService.init();

        themeService.toggle();

        expect(themeService.get()).toBe('light');
        expect(localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement.dataset.theme).toBe('light');
    });
});
