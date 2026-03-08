import { BaseComponent } from "../../../core/base/baseComponent.js";

export class Avatar extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.src = props.src || "";
        this.class = props.class || "";
    }
    render() {
        const avatar = document.createElement('img');
        avatar.className = 'chatAvatar';
        avatar.src = this.src;
        avatar.className = this.class;
        return avatar;
    }
}