import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo } from "../../../types/profile";
import { Avatar } from "../../ui/avatar/avatar";
import { Button } from "../../ui/button/button";
import { SettingsFullNameForm } from "../settingsFullNameForm/settingsFullNameForm";
import template from './profileMainInfoBlock.hbs'

interface ProfileMainInfoBlockProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    type: "contact" | "private_profile";
    onInput?: (firstName: string, lastName: string) => void;
    onAvatarFile?: (file: File) => void;
};

export class ProfileMainInfoBlock extends BaseComponent<ProfileMainInfoBlockProps> {
    private profileAvatar: Avatar | null = null;
    private settingsFullNameForm: SettingsFullNameForm | null = null;
    private wrapOverlay: Button | null = null;
    private avatarFileInput: HTMLInputElement | null = null;

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
                const avatarWrapper = document.createElement('div');
                avatarWrapper.className = "settings-avatar-wrap";
                this.element!.appendChild(avatarWrapper);
                this.profileAvatar = new Avatar({
                    src: this.props.profileMainInfo.avatarUrl,
                    class: "private-profile-avatar"
                });
                this.profileAvatar.mount(avatarWrapper);
                this.wrapOverlay = new Button({
                    icon: "/assets/images/icons/photoEdit.svg",
                    class: "settings-avatar-wrap__overlay",
                    type: "button",
                    onClick: () => {
                        if (!this.avatarFileInput) return;
                        this.avatarFileInput.value = '';
                        this.avatarFileInput.click();
                    },
                });
                this.wrapOverlay.mount(avatarWrapper);
                this.avatarFileInput = document.createElement('input');
                this.avatarFileInput.type = "file";
                this.avatarFileInput.accept = "image/*";
                this.avatarFileInput.hidden = true;
                avatarWrapper.appendChild(this.avatarFileInput!);

                this.avatarFileInput.addEventListener('change', () => {
                    const file = this.avatarFileInput?.files?.[0];
                    if (!file) return;
                    this.props.onAvatarFile?.(file);
                });

                this.settingsFullNameForm = new SettingsFullNameForm({
                    firstName: this.props.profileMainInfo.firstName,
                    lastName: this.props.profileMainInfo.lastName,
                    onChange: this.props.onInput,
                });
                this.settingsFullNameForm.mount(this.element!);
                break;
        }
    };

    protected beforeUnmount(): void {
        this.settingsFullNameForm?.unmount();
        this.wrapOverlay?.unmount();
        this.profileAvatar?.unmount();
    };
};