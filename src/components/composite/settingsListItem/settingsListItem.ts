import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Router } from "../../../core/router";
import { authService } from "../../../services/authService";
import { SettingsItem } from "../settingsItem/settingsItem";
import template from "./settingsListItem.hbs";

interface SettingsListItemProps extends IBaseComponentProps {
    router: Router;
    onProfileClick: () => void;
};

export class SettingsListItem extends BaseComponent<SettingsListItemProps> {
    private profileSetting: SettingsItem | null = null;
    private commonSetting: SettingsItem | null = null;
    private privacySetting: SettingsItem | null = null;
    private subscriptionSetting: SettingsItem | null = null;
    private logoutSetting: SettingsItem | null = null;
    private mainContentArea: HTMLElement | null = null;
    private activeItem: SettingsItem | null = null;

    constructor(props: SettingsListItemProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    private setActiveSetting(settingItem: SettingsItem): void {
        this.activeItem?.element.classList.remove('settings-item--selected');
        this.activeItem = settingItem;
        this.activeItem.element.classList.add('settings-item--selected');
    };

    private handleLogout = async (): Promise<void> => {
        await authService.logout();
        this.props.router.navigate('/login');
    };

    protected afterMount(): void {
        this.mainContentArea = this.element;
        this.profileSetting = new SettingsItem({
            src: '/assets/images/icons/profile.svg',
            title: 'Мой профиль',
            onClick: () => {
                this.setActiveSetting(this.profileSetting!);
                this.props.onProfileClick();
            },
        });
        this.profileSetting.mount(this.mainContentArea);

        this.commonSetting = new SettingsItem({
            src: '/assets/images/icons/commonSettings.svg',
            title: 'Общие',
            onClick: () => {
                this.setActiveSetting(this.commonSetting!);
                this.props.router.navigate(`/settings/common`);
            },
        });
        this.commonSetting.mount(this.mainContentArea);

        this.privacySetting = new SettingsItem({
            src: '/assets/images/icons/privacySettings.svg',
            title: 'Конфиденциальность',
            onClick: () => {
                this.setActiveSetting(this.privacySetting!);
                this.props.router.navigate(`/settings/privacy`);
            },
        });
        this.privacySetting.mount(this.mainContentArea);

        this.subscriptionSetting = new SettingsItem({
            src: '/assets/images/icons/subscriptionSettings.svg',
            title: 'Подписка ImPulse',
            onClick: () => {
                this.setActiveSetting(this.subscriptionSetting!);
                this.props.router.navigate(`/settings/subscription`);
            },
        });
        this.subscriptionSetting.mount(this.mainContentArea);

        this.logoutSetting = new SettingsItem({
            src: '/assets/images/icons/logoutSettings.svg',
            title: 'Выйти из аккаунта',
            class: "logout-setting",
            onClick: this.handleLogout,
        });
        this.logoutSetting.mount(this.mainContentArea);
    };

    protected beforeUnmount(): void {
        this.profileSetting?.unmount();
        this.commonSetting?.unmount();
        this.privacySetting?.unmount();
        this.subscriptionSetting?.unmount();
        this.logoutSetting?.unmount();
    };
};