import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo } from "../../../types/profile";
import { Avatar } from "../../ui/avatar/avatar";
import template from './profileMainInfoBlock.hbs'

interface ProfileMainInfoBlockProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
};

export class ProfileMainInfoBlock extends BaseComponent<ProfileMainInfoBlockProps> {
    private profileAvatar: Avatar | null = null;

    constructor(props: ProfileMainInfoBlockProps) {
        super(props);
    };

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.profileAvatar = new Avatar({
            src: this.props.profileMainInfo.avatarUrl,
            class: "profile-avatar"
        });
        this.profileAvatar.mount(this.element!);
        const userFullName = document.createElement('p');
        userFullName.className = 'user-full-name';
        userFullName.textContent = `${this.props.profileMainInfo.firstName} ${this.props.profileMainInfo.lastName}`;
        this.element!.appendChild(userFullName);
    };

    protected beforeUnmount(): void {
        this.profileAvatar?.unmount();
    };
};