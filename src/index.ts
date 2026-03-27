import { App } from "./core/app.js";

/**
 * Хелпер Handlebars для сравнения двух значений.
 * Использование в шаблоне: `{{#if (eq v1 v2)}}...{{/if}}`
 */
Handlebars.registerHelper('eq', function(v1: any, v2: any) {
    return v1 === v2;
});

/**
 * Хелпер Handlebars для логического И.
 * Использование в шаблоне: `{{#if (a and b)}}...{{/if}}`
 */
Handlebars.registerHelper('and', function(...args: any[]) {
    args.pop(); // Удаляем опции Handlebars
    return args.every(Boolean);
});

Handlebars.registerHelper('not', function(value: any) {
    return !value;
});

/**
 * Точка входа: создаёт и запускает приложение после загрузки DOM.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    await app.start();
});