import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo } from "../../../types/profile";
import { Avatar } from "../../ui/avatar/avatar";
import { SettingsFullNameForm } from "../settingsFullNameForm/settingsFullNameForm";
import template from './profileMainInfoBlock.hbs'

/**
 * @interface ProfileMainInfoBlockProps - Свойства основного блока профиля.
 * @property {ProfileMainInfo} profileMainInfo - Информация о профиле.
 * @property {"contact" | "private_profile"} type - Тип отображения (чужой профиль или свой).
 * @property {Function} [onInput] - Колбэк при изменении имени/фамилии.
 * @property {Function} [onAvatarEditClick] - Колбэк при клике на редактирование аватарки.
 */
interface ProfileMainInfoBlockProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    type: "contact" | "private_profile";
    onInput?: (firstName: string, lastName: string) => void;
    onAvatarEditClick?: (avatarWrapElement: HTMLElement) => void;
};

/**
 * Компонент основного блока информации профиля.
 * Отображает аватарку и форму (или текст) с именем пользователя.
 */
export class ProfileMainInfoBlock extends BaseComponent<ProfileMainInfoBlockProps> {
    private profileAvatar: Avatar | null = null;
    private settingsFullNameForm: SettingsFullNameForm | null = null;

    constructor(props: ProfileMainInfoBlockProps) {
        super(props);
    };

    /**
     * @override
     */
    public getTemplate(): (context?: any) => string {
        return (context: any) => template({
            ...this.props.profileMainInfo,
            isPrivate: this.props.type === "private_profile",
            ...context
        });
    }

    /**
     * @override
     */
    protected afterMount(): void {
        if (!this.element) return;

        const avatarSlot = this.element.querySelector('[data-component="profile-avatar-slot"]');
        if (avatarSlot) {
            this.profileAvatar = new Avatar({
                src: this.props.profileMainInfo.avatarUrl,
                class: this.props.type === "private_profile" ? "private-profile-avatar" : "profile-avatar"
            });
            this.profileAvatar.mount(avatarSlot as HTMLElement);
        }

        if (this.props.type === "private_profile") {
            const avatarContainer = this.element.querySelector('.profile-info__avatar-container');
            if (avatarContainer) {
                avatarContainer.addEventListener('click', this.handleAvatarClick);
            }

            const nameFormSlot = this.element.querySelector('[data-component="full-name-form-slot"]');
            if (nameFormSlot) {
                this.settingsFullNameForm = new SettingsFullNameForm({
                    firstName: this.props.profileMainInfo.firstName,
                    lastName: this.props.profileMainInfo.lastName,
                    onChange: this.props.onInput,
                });
                this.settingsFullNameForm.mount(nameFormSlot as HTMLElement);
            }
        }
    };

    /**
     * Обработчик клика по аватарке.
     * @private
     */
    private handleAvatarClick = () => {
        const avatarContainer = this.element?.querySelector('.profile-info__avatar-container');
        if (avatarContainer) {
            this.props.onAvatarEditClick?.(avatarContainer as HTMLElement);
        }
    };

    /**
     * @override
     */
    protected beforeUnmount(): void {
        const avatarContainer = this.element?.querySelector('.profile-info__avatar-container');
        if (avatarContainer) {
            avatarContainer.removeEventListener('click', this.handleAvatarClick);
        }

        this.settingsFullNameForm?.unmount();
        this.profileAvatar?.unmount();
    };
};