import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo, ProfileAdditionalInfo } from "../../../types/profile";
import { ProfileHeader } from "../profileHeader/profileHeader";
import template from "./profileWindow.hbs"

interface ProfileWindowProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    profileAdditionalInfo: ProfileAdditionalInfo;
};

export class ProfileWindow extends BaseComponent<ProfileWindowProps> {
    private profileHeader: ProfileHeader | null = null;

    constructor(props: ProfileWindowProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.profileHeader = new ProfileHeader({});
        this.profileHeader.mount(this.element);
    };

    protected beforeUnmount(): void {
        this.profileHeader?.unmount();
    };
    
};