/**
 * @file themeService.ts
 * @description Сервис управления темой оформления (light / dark).
 *              Хранит выбор пользователя в localStorage, применяет атрибут
 *              data-theme на <html> и слушает системные изменения
 *              (prefers-color-scheme), пока пользователь не сделал явный выбор.
 */

export type Theme = 'dark' | 'light';
export type ThemeListener = (theme: Theme) => void;

const STORAGE_KEY = 'theme';

class ThemeService {
    private current: Theme = 'dark';
    private listeners = new Set<ThemeListener>();
    private mediaQuery: MediaQueryList | null = null;
    private hasUserOverride = false;
    private initialized = false;

    public init(): void {
        if (this.initialized) return;
        this.initialized = true;

        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        this.hasUserOverride = stored === 'light' || stored === 'dark';

        if (this.hasUserOverride) {
            this.current = stored as Theme;
        } else if (window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.current = this.mediaQuery.matches ? 'dark' : 'light';
            this.mediaQuery.addEventListener('change', this.handleSystemChange);
        }

        this.apply(this.current);
    }

    public get(): Theme {
        return this.current;
    }

    public set(theme: Theme): void {
        this.hasUserOverride = true;
        localStorage.setItem(STORAGE_KEY, theme);
        this.apply(theme);
    }

    public toggle(): void {
        this.set(this.current === 'dark' ? 'light' : 'dark');
    }

    public subscribe(listener: ThemeListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private apply(theme: Theme): void {
        this.current = theme;
        document.documentElement.dataset.theme = theme;
        this.listeners.forEach(l => l(theme));
    }

    private handleSystemChange = (e: MediaQueryListEvent): void => {
        if (this.hasUserOverride) return;
        this.apply(e.matches ? 'dark' : 'light');
    };
}

export const themeService = new ThemeService();
