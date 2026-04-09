import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Avatar } from "../../ui/avatar/avatar";
import { Button } from "../../ui/button/button";
import template from './profileHeader.hbs'

interface ProfileHeaderProps extends IBaseComponentProps {
    closeWindow: (event: MouseEvent) => void;
    label: string;
};

export class ProfileHeader extends BaseComponent<ProfileHeaderProps> {
    private backButton: Button | null = null;
    private mainParagraph: HTMLElement | null = null;
    private profileIcon: Avatar | null = null;
    private label: string | null = null;

    constructor(props: ProfileHeaderProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.backButton = new Button({
            icon: "/assets/images/icons/arrow_left_alt.svg",
            type: "submit",
            class: "back-button",
            onClick: this.props.closeWindow
        })
        this.backButton.mount(this.element);
        this.mainParagraph = document.createElement("div");
        this.mainParagraph.className = "profile-header__title";
        this.element!.appendChild(this.mainParagraph);
        this.profileIcon = new Avatar({
            class: "profile-header-icon",
            src: "/assets/images/icons/profile.svg"
        })
        this.profileIcon.mount(this.mainParagraph);
        const title = document.createElement('p');
        title.className = 'profile-header-title';
        title.textContent = this.props.label;
        this.mainParagraph.appendChild(title);
    };

    protected beforeUnmount(): void {
        this.backButton?.unmount();
        this.profileIcon?.unmount();
        this.mainParagraph?.remove();
    };
};