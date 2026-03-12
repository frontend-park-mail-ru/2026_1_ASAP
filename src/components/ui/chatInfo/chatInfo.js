import { BaseComponent } from "../../../core/base/baseComponent.js";

export class ChatInfo extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.tempName = "components/ui/chatInfo/chatInfo";
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