declare const __LOCAL_API__: boolean;

/**
 * Объявление глобального объекта Handlebars для TypeScript.
 * Позволяет использовать Handlebars.templates в TS-коде без ошибок.
 */
declare global {
    interface Window {
        Handlebars: {
            templates: {
                [key: string]: (context?: any) => string;
            };
            registerHelper: (name: string, fn: Function) => void;
        };
    }
    const Handlebars: Window['Handlebars'];
}