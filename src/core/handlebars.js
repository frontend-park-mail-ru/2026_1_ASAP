import Handlebars from 'handlebars/runtime.js';

// Регистрируем все необходимые хелперы здесь
Handlebars.registerHelper('eq', function (v1, v2) {
    return v1 === v2;
});

Handlebars.registerHelper('and', function (...args) {
    // Убираем последний аргумент (объект options от Handlebars)
    const options = args.pop();
    return args.every(Boolean);
});

// Экспортируем настроенный экземпляр
export default Handlebars;