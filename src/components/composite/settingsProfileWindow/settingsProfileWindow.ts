import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileAdditionalInfo, ProfileMainInfo } from "../../../types/profile";
import { ProfileHeader } from "../profileHeader/profileHeader";
import template from "./settingsProfileWindow.hbs";

interface SettingsProfileWindowProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    profileAdditionalInfo: ProfileAdditionalInfo;
    closeWindow: (event: MouseEvent) => void;
};

export class SettingsProfileWindow extends BaseComponent<SettingsProfileWindowProps> {
    private profileHeader: ProfileHeader | null = null;
    
    constructor(props: SettingsProfileWindowProps) {
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
    };

    protected beforeUnmount(): void {
        
    };
};