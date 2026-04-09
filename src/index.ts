/**
 * @file Главный файл-точка входа в приложение.
 * @module index
 *
 * @description
 * Этот файл отвечает за инициализацию и запуск всего клиентского приложения.
 * Он импортирует основные стили, настраивает Handlebars и создаёт
 * экземпляр класса `App`.
 *
 * Основная логика заключена в обработчике события `DOMContentLoaded`,
 * который гарантирует, что скрипт начнёт выполняться только после полной
 * загрузки и парсинга HTML-документа.
 */

import { App } from "./core/app";
import { authService } from "./services/authService";
import "./styles/main.css";
import "./core/handlebars";

/**
 * @function
 * @description Главная функция, выполняемая после загрузки DOM.
 * Создаёт экземпляр класса `App` и вызывает его метод `start()`
 * для инициализации и запуска приложения (регистрация роутов,
 * рендеринг начальной страницы и т.д.).
 */
document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();

    window.addEventListener('unauthorized', () => {
        authService.isAuthStatus = false;
        app.router.navigate('/login');
    });

    await app.start();
});
