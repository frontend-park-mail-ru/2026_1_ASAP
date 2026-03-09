import { BaseComponent } from "../../../core/base/baseComponent.js";

export class ChatInfo extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.class = props.class;
    }

    render() {
        const message = document.createElement('div');
        message.className = this.class;
        switch (message.className) {
        case 'message-personal':
            message.innerHTML = `
                <p class="user-name">${this.props.name || 'Имя'}</p>
                <p class="msg-text">${this.props.lastMessage || ''}</p>
            `;
            break;
        case 'message-group':
            message.innerHTML = `
                <p class="group-name">${this.props.name || 'Имя'}</p>
                <p class="user-name sender-group" style="display: inline;">${this.props.sender || 'Имя'}:</p>
                <p style="display: inline;" class="msg-text">${this.props.lastMessage || ''}</p>
            `;
            break;
        case 'message-chanel':
            message.innerHTML = `
                <p class="chanel-name">${this.props.name || 'Имя'}</p>
                <p class="msg-text">${this.props.lastMessage || ''}</p>
            `;
            break;
        };
        return message;
    }

    afterMount() {
        if (this.props.onClick) {
            this.element.addEventListener("click", this.props.onClick);
        }
    }

    beforeUnmount() {
        if (this.props.onClick) {
            this.element.removeEventListener("click", this.props.onClick);
        }
    }
}