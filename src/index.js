import "./styles/main.css"
import { App } from "./core/app.js";

document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    await app.start();
})

