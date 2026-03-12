import { App } from "./core/app.js";

Handlebars.registerHelper('eq', function(v1, v2) {
    return v1 === v2;
});
Handlebars.registerHelper('and', function(...args) {
    args.pop();
    return args.every(Boolean);
});
document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    await app.start();
});

