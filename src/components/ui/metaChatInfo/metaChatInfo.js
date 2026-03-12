import { BaseComponent } from "../../../core/base/baseComponent.js";

export class MetaChatInfo extends BaseComponent {
    constructor(props={}) {
        super(props);
        this.tempName = 'components/ui/metaChatInfo/metaChatInfo';
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