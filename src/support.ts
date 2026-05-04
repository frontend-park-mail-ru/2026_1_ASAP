import "./styles/main.scss";
import "./core/handlebars";
import { PULSE_SUPPORT_CLOSE } from "./core/constants/supportIframe";
import { SupportOverlay } from "./components/composite/supportOverlay/supportOverlay";

document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("rootSupport");
    if (root) {
        const overlay = new SupportOverlay({
            onCloseClick: () => {
                try {
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage(
                            { type: PULSE_SUPPORT_CLOSE },
                            window.location.origin
                        );
                    }
                } catch {
                    // запасной вариант, если postMessage запрещён
                }
            }
        });
        overlay.mount(root);
    } else {
        console.error("[support.ts] : Корневой элемент для поддержки не найден");
    }
});
