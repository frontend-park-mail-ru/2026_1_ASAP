import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ProfileMainInfo } from "../../../types/profile";
import { Avatar } from "../../ui/avatar/avatar";
import { SettingsFullNameForm } from "../settingsFullNameForm/settingsFullNameForm";
import { presenceService } from "../../../services/presenceService";
import { chatService } from "../../../services/chatService";
import { PresenceState } from "../../../core/utils/wsClient";
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
    userId?: number;
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
    private unsubscribePresence: (() => void) | null = null;

    constructor(props: ProfileMainInfoBlockProps) {
        super(props);
    };

    /**
     * @override
     */
    public getTemplate(): (context?: object) => string {
        return (context = {}) => template({
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
        } else if (this.props.userId) {
            // contact view — статус под именем
            const userId = this.props.userId;
            this.unsubscribePresence = presenceService.subscribe(userId, (state) => {
                this.renderPresence(state);
            });
            const cached = presenceService.get(userId);
            if (cached) {
                this.renderPresence(cached);
            } else {
                chatService.getUserProfile(userId);
            }
        }
    };

    private renderPresence(state: PresenceState): void {
        const el = this.element?.querySelector('.contact-user-status');
        if (!el) return;

        if (state.isOnline) {
            el.textContent = 'в сети';
            el.classList.add('contact-user-status--online');
            return;
        }
        el.classList.remove('contact-user-status--online');

        if (state.lastSeenAt) {
            el.textContent = `был(а) в сети ${this.formatRelative(state.lastSeenAt)}`;
        } else {
            el.textContent = 'был(а) в сети недавно';
        }
    }

    private formatRelative(date: Date): string {
        const diffMs = Date.now() - date.getTime();
        const min = Math.floor(diffMs / 60_000);
        if (min < 1) return 'только что';
        if (min < 60) return `${min} мин назад`;
        const hours = Math.floor(min / 60);
        if (hours < 24) return `${hours} ч назад`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} дн назад`;
        return date.toLocaleDateString('ru-RU');
    }

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

        this.unsubscribePresence?.();
        this.unsubscribePresence = null;

        this.settingsFullNameForm?.unmount();
        this.profileAvatar?.unmount();
    };
};
