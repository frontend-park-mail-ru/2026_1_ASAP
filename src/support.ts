import "./styles/main.scss";
import "./core/handlebars";
import { SupportOverlay } from "./components/composite/supportOverlay/supportOverlay";


document.addEventListener("DOMContentLoaded", async () => {
    const root = document.querySelector('.rootSupport');
    const overlay = new SupportOverlay({});
    root.appendChild(overlay.element!);
});
