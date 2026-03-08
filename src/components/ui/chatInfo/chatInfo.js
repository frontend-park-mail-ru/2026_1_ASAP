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
                <p class="user-name">Имя</p>
                <p class="msg-text">Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет</p>
            `;
            break;
        case 'message-group':
            message.innerHTML = `
                <p class="group-name">Название</p>
                <p class="user-name">Имя</p>
                <p class="msg-text">Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет</p>
            `;
            break;
        case 'message-chanel':
            message.innerHTML = `
                <p class="chanel-name">Имя</p>
                <p class="msg-text">Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет Привет</p>
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