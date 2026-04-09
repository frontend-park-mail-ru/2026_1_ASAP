import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileAdditionalInfo, ProfileMainInfo } from "../../../types/profile";
import { Button } from "../../ui/button/button";
import { ProfileAdditionalInfoBlock } from "../profileAdditionalInfoBlock/profileAdditionalInfoBlock";
import { ProfileHeader } from "../profileHeader/profileHeader";
import { ProfileMainInfoBlock } from "../profileMainInfoBlock/profileMainInfoBlock";
import template from "./settingsProfileWindow.hbs";

interface SettingsProfileWindowProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    profileAdditionalInfo: ProfileAdditionalInfo;
    closeWindow: (event: MouseEvent) => void;
};

export class SettingsProfileWindow extends BaseComponent<SettingsProfileWindowProps> {
    private profileHeader: ProfileHeader | null = null;
    private profileSaveButton: Button | null = null;
    private isDisabled: Boolean | null = true;
    private profileMainInfoBlock: ProfileMainInfoBlock | null = null;
    private profileAdditionalInfoBlock: ProfileAdditionalInfoBlock | null = null;


    constructor(props: SettingsProfileWindowProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    // setButtonState(): void {
    //     if (this.isDisabled) {
    //         this.profileSaveButton.element.classList.add("ui-button__disabled");
    //     } else {
    //         this.profileSaveButton.element.classList.remove("ui-button__disabled");
    //     }
    // }

    protected afterMount(): void {
        this.profileHeader = new ProfileHeader({
            closeWindow: this.props.closeWindow,
            label: "Мой профиль"
        });
        this.profileHeader.mount(this.element!);

        this.profileMainInfoBlock = new ProfileMainInfoBlock({
            profileMainInfo: this.props.profileMainInfo,
            type: "private_profile"
        });
        this.profileMainInfoBlock.mount(this.element!);
        this.profileAdditionalInfoBlock = new ProfileAdditionalInfoBlock({
            profileAdditionalInfo: this.props.profileAdditionalInfo,
            class: "settings-additional-info"
        });
        this.profileAdditionalInfoBlock.mount(this.element!);

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = "settings-profile-save-button-wrapper";
        this.profileSaveButton = new Button({
            label: "Сохранить изменения",
            class: "ui-button ui-button__primary ui-button__disabled",
        });
        this.element!.appendChild(buttonWrapper);
        this.profileSaveButton.mount(buttonWrapper);
    };

    protected beforeUnmount(): void {
        
    };
};