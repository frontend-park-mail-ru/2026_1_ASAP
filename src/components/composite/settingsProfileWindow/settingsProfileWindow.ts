import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { contactService } from "../../../services/contactService";
import { ProfileAdditionalInfo, ProfileMainInfo } from "../../../types/profile";
import { Button } from "../../ui/button/button";
import { AvatarEditMenuOverlay } from "../avatarEditMenuOverlay/avatarEditMenuOverlay";
import { ConfirmModal } from "../confirmModal/confirmModal";
import { EditProfileOverlay } from "../editProfileOverlay/editProfileOverlay";
import { ProfileAdditionalInfoBlock } from "../profileAdditionalInfoBlock/profileAdditionalInfoBlock";
import { ProfileHeader } from "../profileHeader/profileHeader";
import { ProfileMainInfoBlock } from "../profileMainInfoBlock/profileMainInfoBlock";
import template from "./settingsProfileWindow.hbs";

interface SettingsProfileWindowProps extends IBaseComponentProps {
    profileMainInfo: ProfileMainInfo;
    profileAdditionalInfo: ProfileAdditionalInfo;
    closeWindow: (event: MouseEvent) => void;
    onProfileSaved?: (main: ProfileMainInfo, additional: ProfileAdditionalInfo) => void;
};

export type EditableField = 'login' | 'email' | 'birthDate' | 'bio';

const DEFAULT_AVATAR_URL = '/assets/images/avatars/profileAvatar.svg';

export class SettingsProfileWindow extends BaseComponent<SettingsProfileWindowProps> {
    private profileHeader: ProfileHeader | null = null;
    private profileSaveButton: Button | null = null;
    private profileMainInfoBlock: ProfileMainInfoBlock | null = null;
    private profileAdditionalInfoBlock: ProfileAdditionalInfoBlock | null = null;
    private draftProfileMainInfo: ProfileMainInfo | null = null;
    private draftProfileAdditionalInfo: ProfileAdditionalInfo | null = null;
    private editProfileOverlay: EditProfileOverlay | null = null;
    private avatarEditMenu: AvatarEditMenuOverlay | null = null;
    private deleteAvatarConfirm: ConfirmModal | null = null;
    private avatarFileInput: HTMLInputElement | null = null;
    private avatarPreviewUrl: string | null = null;
    private pendingAvatarFile: File | null = null;
    private baselineProfileMainInfo: ProfileMainInfo;
    private baselineProfileAdditionalInfo: ProfileAdditionalInfo;
    private saveButtonWrapper: HTMLElement | null = null;
    private isSavingProfile = false;

    constructor(props: SettingsProfileWindowProps) {
        super(props);
        this.draftProfileMainInfo = this.normalizeMainInfo(structuredClone(props.profileMainInfo));
        this.draftProfileAdditionalInfo = this.normalizeAdditionalInfo(structuredClone(props.profileAdditionalInfo));
        this.baselineProfileMainInfo = structuredClone(this.draftProfileMainInfo);
        this.baselineProfileAdditionalInfo = structuredClone(this.draftProfileAdditionalInfo);
    };

    /** Как в convertToFrontendProfile: пустые строки вместо undefined, чтобы JSON.stringify совпадал с ответом getMyProfile */
    private normalizeMainInfo(m: ProfileMainInfo): ProfileMainInfo {
        return {
            firstName: m.firstName ?? '',
            lastName: m.lastName ?? '',
            avatarUrl: m.avatarUrl ?? DEFAULT_AVATAR_URL,
            lastSeen: m.lastSeen,
        };
    }

    private normalizeAdditionalInfo(a: ProfileAdditionalInfo): ProfileAdditionalInfo {
        const birthRaw = a.birthDate;
        const birthDate =
            birthRaw !== undefined && birthRaw !== null && String(birthRaw).trim() !== ''
                ? String(birthRaw)
                : undefined;
        return {
            login: a.login,
            email: a.email ?? '',
            birthDate,
            bio: a.bio ?? '',
        };
    }

    /** Сравнение без JSON.stringify (порядок ключей, пробелы в bio/email) */
    private isDraftMatchingBaseline(): boolean {
        if (!this.draftProfileMainInfo || !this.draftProfileAdditionalInfo) return true;
        const dm = this.normalizeMainInfo(this.draftProfileMainInfo);
        const bm = this.normalizeMainInfo(this.baselineProfileMainInfo);
        const da = this.normalizeAdditionalInfo(this.draftProfileAdditionalInfo);
        const ba = this.normalizeAdditionalInfo(this.baselineProfileAdditionalInfo);
        return (
            dm.firstName === bm.firstName &&
            dm.lastName === bm.lastName &&
            dm.avatarUrl === bm.avatarUrl &&
            dm.lastSeen === bm.lastSeen &&
            da.login === ba.login &&
            da.email.trim() === ba.email.trim() &&
            da.birthDate === ba.birthDate &&
            da.bio.trim() === ba.bio.trim()
        );
    }

    getTemplate() {
        return template;
    };

    setButtonState(): void {
        const btn = this.profileSaveButton;
        if (!btn?.element || !(btn.element instanceof HTMLButtonElement)) return;

        const dirty =
            this.pendingAvatarFile !== null || !this.isDraftMatchingBaseline();
        const enable = dirty && !this.isSavingProfile;

        btn.disabled = !enable;
        btn.element.classList.toggle("ui-button__disabled", !enable);
        btn.element.title = "";
    }

    handleMainInfoInput = (firstName: string, lastName: string) => {
        if (this.draftProfileMainInfo) {
            this.draftProfileMainInfo.firstName = firstName;
            this.draftProfileMainInfo.lastName = lastName;
        }
        this.setButtonState();
    };

    private closeAvatarMenu(): void {
        this.avatarEditMenu?.unmount();
        this.avatarEditMenu = null;
    }

    private closeDeleteAvatarConfirm(): void {
        this.deleteAvatarConfirm?.unmount();
        this.deleteAvatarConfirm = null;
    }

    private applyAvatarDelete(): void {
        if (this.avatarPreviewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
        }
        this.avatarPreviewUrl = null;
        this.pendingAvatarFile = null;
        if (this.draftProfileMainInfo) {
            this.draftProfileMainInfo.avatarUrl = DEFAULT_AVATAR_URL;
        }
        this.remountProfileMainInfoBlock();
        this.setButtonState();
    }

    handleAvatarEditClick = (avatarWrap: HTMLElement): void => {
        this.closeAvatarMenu();
        const rect = avatarWrap.getBoundingClientRect();
        this.avatarEditMenu = new AvatarEditMenuOverlay({
            anchorRect: rect,
            onUpload: () => {
                if (!this.avatarFileInput) return;
                this.avatarFileInput.value = "";
                this.avatarFileInput.click();
            },
            onDelete: () => {
                this.closeAvatarMenu();
                this.deleteAvatarConfirm = new ConfirmModal({
                    text: "Вы точно хотите удалить аватар?",
                    confirmButtonText: "Удалить",
                    cancelButtonText: "Отменить",
                    onConfirm: () => {
                        this.applyAvatarDelete();
                        this.closeDeleteAvatarConfirm();
                    },
                    onCancel: () => this.closeDeleteAvatarConfirm(),
                });
                this.deleteAvatarConfirm.mount(this.element!);
            },
            onClose: () => this.closeAvatarMenu(),
        });
        this.avatarEditMenu.mount(this.element!);
    };

    handleAvatarFile = (file: File) => {
        this.closeAvatarMenu();
        if (this.avatarPreviewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
        }
        this.pendingAvatarFile = file;
        const url = URL.createObjectURL(file);
        this.avatarPreviewUrl = url;
        if (this.draftProfileMainInfo) {
            this.draftProfileMainInfo.avatarUrl = url;
        }
        this.remountProfileMainInfoBlock();
        this.setButtonState();
    };

    private remountProfileMainInfoBlock(): void {
        if (!this.element || !this.draftProfileMainInfo) return;
        const beforeRef = this.profileAdditionalInfoBlock?.element ?? null;
        this.profileMainInfoBlock?.unmount();
        this.profileMainInfoBlock = new ProfileMainInfoBlock({
            profileMainInfo: this.draftProfileMainInfo,
            type: "private_profile",
            onInput: this.handleMainInfoInput,
            onAvatarEditClick: this.handleAvatarEditClick,
        });
        this.profileMainInfoBlock.mount(this.element);
        const mainEl = this.profileMainInfoBlock.element;
        if (beforeRef?.parentNode === this.element && mainEl) {
            this.element.insertBefore(mainEl, beforeRef);
        }
    }

    private remountProfileAdditionalInfoBlock(): void {
        if (!this.element || !this.draftProfileAdditionalInfo) return;
        const beforeRef = this.saveButtonWrapper;
        this.profileAdditionalInfoBlock?.unmount();
        this.profileAdditionalInfoBlock = new ProfileAdditionalInfoBlock({
            profileAdditionalInfo: this.draftProfileAdditionalInfo,
            class: "settings-additional-info",
            onEditOverlay: this.handleEditAdditionalField,
        });
        this.profileAdditionalInfoBlock.mount(this.element);
        const addlEl = this.profileAdditionalInfoBlock.element;
        if (beforeRef?.parentNode === this.element && addlEl) {
            this.element.insertBefore(addlEl, beforeRef);
        }
    }

    private syncDraftAndBaselineFromServer = async (): Promise<void> => {
        const fresh = await contactService.getMyProfile();
        const prevMain = this.draftProfileMainInfo;
        const mergedMain = this.normalizeMainInfo({
            ...structuredClone(fresh.mainInfo),
            firstName: prevMain?.firstName ?? fresh.mainInfo.firstName,
            lastName: prevMain?.lastName ?? fresh.mainInfo.lastName,
        });
        this.draftProfileMainInfo = mergedMain;
        this.draftProfileAdditionalInfo = this.normalizeAdditionalInfo(structuredClone(fresh.additionalInfo));
        this.baselineProfileMainInfo = structuredClone(mergedMain);
        this.baselineProfileAdditionalInfo = structuredClone(this.draftProfileAdditionalInfo);
        if (this.avatarPreviewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
            this.avatarPreviewUrl = null;
        }
        this.pendingAvatarFile = null;
        this.props.onProfileSaved?.(this.baselineProfileMainInfo, this.baselineProfileAdditionalInfo);
        this.remountProfileMainInfoBlock();
        this.remountProfileAdditionalInfoBlock();
        this.setButtonState();
        queueMicrotask(() => this.setButtonState());
    };

    handleSaveProfile = async (): Promise<void> => {
        if (!this.draftProfileMainInfo || !this.draftProfileAdditionalInfo || this.isSavingProfile) return;
        if (!this.pendingAvatarFile && this.isDraftMatchingBaseline()) return;

        this.isSavingProfile = true;
        if (this.profileSaveButton) {
            this.profileSaveButton.disabled = true;
        }

        let avatarUploaded = false;
        try {
            if (this.pendingAvatarFile) {
                const avatarResult = await contactService.uploadMyAvatar(this.pendingAvatarFile);
                if (!avatarResult.success) {
                    console.error("Аватар", avatarResult.status);
                    return;
                }
                avatarUploaded = true;
            }

            const result = await contactService.setMyProfile(
                this.draftProfileMainInfo,
                this.draftProfileAdditionalInfo
            );
            if (!result.success) {
                console.error("Сохранение профиля не удалось", result.status);
                if (avatarUploaded) {
                    await this.syncDraftAndBaselineFromServer();
                }
                return;
            }
            await this.syncDraftAndBaselineFromServer();
        } finally {
            this.isSavingProfile = false;
            this.setButtonState();
        }
    };

    handleEditAdditionalField = (fieldKey: EditableField, value: string) => {
        const type = {
            'login': 'text',
            'email': 'email',
            'birthDate': 'date',
            'bio': 'textarea'
        };
        this.editProfileOverlay = new EditProfileOverlay({
            fieldKey: fieldKey as EditableField,
            value: value,
            inputType: type[fieldKey] as ('text' | 'email' | 'date' | 'textarea'),
            onSave: (newValue: string) => {
                if (this.draftProfileAdditionalInfo)
                    this.draftProfileAdditionalInfo[fieldKey] = newValue;
                this.editProfileOverlay?.unmount();
                this.editProfileOverlay = null;
                this.remountProfileAdditionalInfoBlock();
                this.setButtonState();
            },
            onClose: () => {
                this.editProfileOverlay?.unmount();
                this.editProfileOverlay = null;
            },
        });
        this.editProfileOverlay.mount(this.element!);
        this.setButtonState();

    };

    protected afterMount(): void {
        this.profileHeader = new ProfileHeader({
            closeWindow: this.props.closeWindow,
            label: "Мой профиль"
        });
        this.profileHeader.mount(this.element!);

        this.profileMainInfoBlock = new ProfileMainInfoBlock({
            profileMainInfo: this.draftProfileMainInfo,
            type: "private_profile",
            onInput: this.handleMainInfoInput,
            onAvatarEditClick: this.handleAvatarEditClick,
        });
        this.profileMainInfoBlock.mount(this.element!);

        this.profileAdditionalInfoBlock = new ProfileAdditionalInfoBlock({
            profileAdditionalInfo: this.draftProfileAdditionalInfo,
            class: "settings-additional-info",
            onEditOverlay: this.handleEditAdditionalField,
        });
        this.profileAdditionalInfoBlock.mount(this.element!);

        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = "settings-profile-save-button-wrapper";
        this.saveButtonWrapper = buttonWrapper;
        this.profileSaveButton = new Button({
            label: "Сохранить изменения",
            class: "ui-button ui-button__primary ui-button__disabled",
            disabled: true,
            onClick: () => {
                void this.handleSaveProfile();
            },
        });
        this.element!.appendChild(buttonWrapper);
        this.profileSaveButton.mount(buttonWrapper);
        this.avatarFileInput = document.createElement("input");
        this.avatarFileInput.type = "file";
        this.avatarFileInput.accept = "image/*";
        this.avatarFileInput.hidden = true;
        this.element!.appendChild(this.avatarFileInput);
        this.avatarFileInput.addEventListener("change", () => {
            const file = this.avatarFileInput?.files?.[0];
            if (file) this.handleAvatarFile(file);
        });
        this.setButtonState();
    };

    protected beforeUnmount(): void {
        this.closeAvatarMenu();
        this.closeDeleteAvatarConfirm();
        if (this.avatarFileInput?.parentNode) {
            this.avatarFileInput.parentNode.removeChild(this.avatarFileInput);
        }
        this.avatarFileInput = null;
        if (this.avatarPreviewUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
            this.avatarPreviewUrl = null;
        }
        this.profileHeader?.unmount();
        this.profileMainInfoBlock?.unmount();
        this.editProfileOverlay?.unmount();
        this.profileSaveButton?.unmount();
        this.profileAdditionalInfoBlock?.unmount();
    };
};