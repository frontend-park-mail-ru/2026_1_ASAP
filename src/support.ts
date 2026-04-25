import "./styles/main.scss";
import "./core/handlebars";
import { SupportOverlay } from "./components/composite/supportOverlay/supportOverlay";


document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById('rootSupport');
    if (root) {
        const overlay = new SupportOverlay({});
        overlay.mount(root);
    } else {
        console.error("[support.ts] : Корневой элемент для поддержки не найден");
    }
});
