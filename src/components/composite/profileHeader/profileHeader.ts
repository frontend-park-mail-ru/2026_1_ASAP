import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from './profileHeader.hbs'

export class ProfileHeader extends BaseComponent {
    private backButton: Button | null = null;

    constructor(props: IBaseComponentProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.backButton = new Button({
            icon: "/assets/images/icons/arrow_left_alt.svg",
            type: "reset",
            class: "back-button",
        })
        this.backButton.mount(this.element);
    };

    protected beforeUnmount(): void {
        this.backButton?.unmount();
    };
};