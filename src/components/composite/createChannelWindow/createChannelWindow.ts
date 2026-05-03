import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { ActionHeader } from '../../ui/actionHeader/actionHeader';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Input } from '../../ui/input/input';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { Router } from '../../../core/router';
import template from './createChannelWindow.hbs';
import './createChannelWindow.scss';

const MAX_TITLE_LENGTH = 100;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

interface CreateChannelWindowProps extends IBaseComponentProps {
    router: Router;
    onSubmit: (title: string, avatar?: File) => Promise<void>;
}

export class CreateChannelWindow extends BaseComponent<CreateChannelWindowProps> {
    private headerComponent: ActionHeader | null = null;
    private avatarComponent: Avatar | null = null;
    private nameInput: Input | null = null;
    private submitButton: Button | null = null;
    private fileInput: HTMLInputElement | null = null;
    private selectedAvatarFile: File | null = null;
    private avatarPreviewUrl: string | null = null;
    private alertModal: ConfirmModal | null = null;

    constructor(props: CreateChannelWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const headerSlot = this.element.querySelector('[data-component="header-slot"]');
        if (headerSlot) {
            this.headerComponent = new ActionHeader({
                backButton: new Button({
                    label: '',
                    icon: '/assets/images/icons/arrow_left_alt.svg',
                    class: 'create-channel-window__back-button',
                    title: 'Назад',
                    onClick: () => this.props.router.navigate('/chats'),
                }),
                content: 'Создание канала',
                icon: '/assets/images/icons/createChatMenuIcons/group.svg',
            });
            this.headerComponent.mount(headerSlot as HTMLElement);
        }

        const avatarSlot = this.element.querySelector('[data-component="avatar-slot"]') as HTMLElement;
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: '/assets/images/avatars/defaultGroup.svg',
                class: 'create-channel-window__avatar',
            });
            this.avatarComponent.mount(avatarSlot);

            const overlay = document.createElement('div');
            overlay.className = 'create-channel-window__avatar-overlay';
            const cameraIcon = document.createElement('img');
            cameraIcon.src = '../assets/images/icons/photoEdit.svg';
            cameraIcon.className = 'create-channel-window__camera-icon';
            overlay.appendChild(cameraIcon);
            avatarSlot.appendChild(overlay);

            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = ALLOWED_AVATAR_TYPES.join(',');
            this.fileInput.style.display = 'none';
            this.element.appendChild(this.fileInput);

            this.fileInput.addEventListener('change', () => {
                const file = this.fileInput?.files?.[0];
                if (!file) return;
                if (!this.validateAvatar(file)) {
                    if (this.fileInput) this.fileInput.value = '';
                    return;
                }
                this.selectedAvatarFile = file;
                if (this.avatarPreviewUrl) URL.revokeObjectURL(this.avatarPreviewUrl);
                this.avatarPreviewUrl = URL.createObjectURL(file);
                const img = this.element?.querySelector('img.create-channel-window__avatar') as HTMLImageElement;
                if (img) img.src = this.avatarPreviewUrl;
            });

            avatarSlot.addEventListener('click', () => this.fileInput?.click());
        }

        const nameSlot = this.element.querySelector('[data-component="name-slot"]');
        if (nameSlot) {
            this.nameInput = new Input({
                class: 'create-channel-window__name-input',
                placeholder: 'Название канала',
                value: '',
            });
            this.nameInput.mount(nameSlot as HTMLElement);
        }

        const submitSlot = this.element.querySelector('[data-component="submit-slot"]');
        if (submitSlot) {
            this.submitButton = new Button({
                label: 'Создать канал',
                class: 'create-channel-submit-btn',
                onClick: () => this.handleSubmit(),
            });
            this.submitButton.mount(submitSlot as HTMLElement);
        }
    }

    private validateAvatar(file: File): boolean {
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            this.showAlert('Пожалуйста, используйте формат JPEG, PNG или WEBP');
            return false;
        }
        if (file.size > MAX_AVATAR_SIZE) {
            this.showAlert('Выберите файл размером до 5 МБ');
            return false;
        }
        return true;
    }

    private async handleSubmit(): Promise<void> {
        const title = this.nameInput?.value?.trim() || '';

        if (!title) {
            this.showAlert('Введите название канала');
            return;
        }
        if (title.length > MAX_TITLE_LENGTH) {
            this.showAlert(`Название канала не должно превышать ${MAX_TITLE_LENGTH} символов`);
            return;
        }

        if (this.submitButton?.element) {
            (this.submitButton.element as HTMLButtonElement).disabled = true;
        }

        try {
            await this.props.onSubmit(title, this.selectedAvatarFile || undefined);
        } finally {
            if (this.submitButton?.element) {
                (this.submitButton.element as HTMLButtonElement).disabled = false;
            }
        }
    }

    private showAlert(text: string): void {
        this.alertModal?.unmount();
        this.alertModal = new ConfirmModal({
            text,
            confirmButtonText: 'Понятно',
            hideCancel: true,
            confirmButtonClass: 'ui-button ui-button__secondary',
            onConfirm: () => {
                this.alertModal?.unmount();
                this.alertModal = null;
            },
        });
        this.alertModal.mount(document.body);
    }

    protected beforeUnmount(): void {
        this.headerComponent?.unmount();
        this.avatarComponent?.unmount();
        this.nameInput?.unmount();
        this.submitButton?.unmount();
        this.alertModal?.unmount();

        if (this.avatarPreviewUrl) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
            this.avatarPreviewUrl = null;
        }
        if (this.fileInput) {
            this.fileInput.remove();
            this.fileInput = null;
        }

        this.headerComponent = null;
        this.avatarComponent = null;
        this.nameInput = null;
        this.submitButton = null;
        this.alertModal = null;
    }
}
