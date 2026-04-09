import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo } from "../../../types/profile";
import { Avatar } from "../../ui/avatar/avatar";
import { SettingsFullNameForm } from "../settingsFullNameForm/settingsFullNameForm";
import template from './profileMainInfoBlock.hbs'

interface ProfileMainInfoBlockProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    type: "contact" | "private_profile";
};

export class ProfileMainInfoBlock extends BaseComponent<ProfileMainInfoBlockProps> {
    private profileAvatar: Avatar | null = null;
    private settingsFullNameForm: SettingsFullNameForm | null = null;

    constructor(props: ProfileMainInfoBlockProps) {
        super(props);
    };

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        switch (this.props.type) {
            case "contact":
                this.element.className = "profile-main-info-block";
                this.profileAvatar = new Avatar({
                    src: this.props.profileMainInfo.avatarUrl,
                    class: "profile-avatar"
                });
                this.profileAvatar.mount(this.element!);
                const userFullName = document.createElement('p');
                userFullName.className = 'contact-user-full-name';
                userFullName.textContent = `${this.props.profileMainInfo.firstName} ${this.props.profileMainInfo.lastName}`;
                this.element!.appendChild(userFullName);
                break;
            case "private_profile":
                this.element.className = "settings-profile-main-info-block";
                this.profileAvatar = new Avatar({
                    src: this.props.profileMainInfo.avatarUrl,
                    class: "private-profile-avatar"
                });
                this.profileAvatar.mount(this.element!);

                this.settingsFullNameForm = new SettingsFullNameForm({
                    firstName: this.props.profileMainInfo.firstName,
                    lastName: this.props.profileMainInfo.lastName
                });
                this.settingsFullNameForm.mount(this.element!);
                break;
        }
    };

    protected beforeUnmount(): void {
        this.profileAvatar?.unmount();
    };
};