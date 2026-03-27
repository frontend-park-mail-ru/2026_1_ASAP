import Handlebars from "handlebars/runtime.js";

/**
 * Хелпер Handlebars для сравнения двух значений.
 * Использование в шаблоне: `{{#if (eq v1 v2)}}...{{/if}}`
 */
Handlebars.registerHelper('eq', function(v1, v2) {
    return v1 === v2;
});

/**
 * Хелпер Handlebars для логического И.
 * Использование в шаблоне: `{{#if (a and b)}}...{{/if}}`
 */
Handlebars.registerHelper('and', function(...args) {
    args.pop();
    return args.every(Boolean);
});

export default Handlebars;