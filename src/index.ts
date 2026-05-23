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
import { themeService } from "./services/themeService";
import "./styles/main.scss";
import "./core/handlebars";
import { presenceService } from "./services/presenceService";
import { notificationService } from "./services/notificationService";

themeService.init();
presenceService.init();
notificationService.init();

const updateAppHeight = (): void => {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
};
updateAppHeight();
window.visualViewport?.addEventListener('resize', updateAppHeight);
window.visualViewport?.addEventListener('scroll', updateAppHeight);
window.addEventListener('orientationchange', updateAppHeight);

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

    // клик по системному уведомлению → переход в соответствующий чат
    window.addEventListener('notification:click', (e: Event) => {
        const ce = e as CustomEvent<{ chatId: string }>;
        if (ce.detail?.chatId) {
            app.router.navigate(`/chats/${ce.detail.chatId}`);
        }
    });

    await app.start();

    if ("serviceWorker" in navigator && window.isSecureContext) {
        let hasController = Boolean(navigator.serviceWorker.controller);
        let refreshing = false;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hasController) {
                hasController = true;
                return;
            }

            if (refreshing) {
                return;
            }

            refreshing = true;
            window.location.reload();
        });

        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/service-worker.js")
                .catch((error) => {
                    console.error("Service Worker registration failed:", error);
                });
        });
    }
});
