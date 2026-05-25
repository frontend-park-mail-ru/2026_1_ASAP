/**
 * @file themeService.ts
 * @description Сервис управления темой оформления (light / dark).
 *              Хранит выбор пользователя в localStorage, применяет атрибут
 *              data-theme на <html>. Без сохранённого выбора пользователя
 *              всегда применяет тёмную тему.
 */

export type Theme = 'dark' | 'light';
export type ThemeListener = (theme: Theme) => void;

const STORAGE_KEY = 'theme';

class ThemeService {
    private current: Theme = 'dark';
    private listeners = new Set<ThemeListener>();
    private initialized = false;

    public init(): void {
        if (this.initialized) return;
        this.initialized = true;

        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;

        if (stored === 'light' || stored === 'dark') {
            this.current = stored as Theme;
        } else {
            this.current = 'dark';
        }

        this.apply(this.current);
    }

    public get(): Theme {
        return this.current;
    }

    public set(theme: Theme): void {
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
}

export const themeService = new ThemeService();
