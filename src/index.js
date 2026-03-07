import { App } from "./core/app.js";

console.log("Hello")

document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    app.start();
})

