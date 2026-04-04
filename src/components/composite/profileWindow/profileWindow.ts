import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo, ProfileAdditionalInfo } from "../../../types/profile";
import { ProfileAdditionalInfoBlock } from "../profileAdditionalInfoBlock/profileAdditionalInfoBlock";
import { ProfileHeader } from "../profileHeader/profileHeader";
import { ProfileMainInfoBlock } from "../profileMainInfoBlock/profileMainInfoBlock";
import template from "./profileWindow.hbs"

interface ProfileWindowProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    profileAdditionalInfo: ProfileAdditionalInfo;
    closeWindow: (event: MouseEvent) => void;
};

export class ProfileWindow extends BaseComponent<ProfileWindowProps> {
    private profileHeader: ProfileHeader | null = null;
    private profileMainInfoBlock: ProfileMainInfoBlock | null = null;
    private profileAdditionalInfoBlock: ProfileAdditionalInfoBlock | null = null;

    constructor(props: ProfileWindowProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        this.profileHeader = new ProfileHeader({
            closeWindow: this.props.closeWindow
        });
        this.profileHeader.mount(this.element!);
        this.profileMainInfoBlock = new ProfileMainInfoBlock({
            profileMainInfo: this.props.profileMainInfo
        });
        this.profileMainInfoBlock.mount(this.element!);
        this.profileAdditionalInfoBlock = new ProfileAdditionalInfoBlock({
            profileAdditionalInfo: this.props.profileAdditionalInfo
        });
        this.profileAdditionalInfoBlock.mount(this.element!);
    };

    protected beforeUnmount(): void {
        this.profileHeader?.unmount();
        this.profileMainInfoBlock?.unmount();
        this.profileAdditionalInfoBlock?.unmount();
    };
    
};