import { App } from "./core/app.js";
import "./styles/main.css";
import "./core/handlebars.js";

/**
 * Точка входа: создаёт и запускает приложение после загрузки DOM.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    await app.start();
});

