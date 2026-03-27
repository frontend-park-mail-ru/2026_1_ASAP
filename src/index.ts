import { App } from "./core/app";
import "./styles/main.css";
import "./core/handlebars";

/**
 * Точка входа: создаёт и запускает приложение после загрузки DOM.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    await app.start();
});

