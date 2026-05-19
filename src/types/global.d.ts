declare const __LOCAL_API__: boolean;

/**
 * Объявление глобального объекта Handlebars для TypeScript.
 * Позволяет использовать Handlebars.templates в TS-коде без ошибок.
 */
declare global {
    interface Window {
        Handlebars: {
            templates: {
                [key: string]: (context?: object) => string;
            };
            registerHelper: (name: string, fn: (...args: unknown[]) => unknown) => void;
        };
    }
    const Handlebars: Window['Handlebars'];
}
