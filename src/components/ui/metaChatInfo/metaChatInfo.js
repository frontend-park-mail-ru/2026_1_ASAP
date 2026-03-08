import { BaseComponent } from "../../../core/base/baseComponent.js";

export class MetaChatInfo extends BaseComponent {
    render() {
        const wrapper = document.createElement('div');
        wrapper.className = "meta-chat-info";
        wrapper.innerHTML = `
            <p class="time">22:20</p>
            <div class="msg-bubble">
                <p class="msg-count">99+</p>
            </div>
        `;
        return wrapper;
    };

    afterMount() {
        if (this.props.onClick) {
            this.element.addEventListener("click", this.props.onClick);
        }
    };

    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    };
}