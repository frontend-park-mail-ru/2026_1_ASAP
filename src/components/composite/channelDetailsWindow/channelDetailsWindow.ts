import { BaseComponent } from '../../../core/base/baseComponent';
import { ActionHeader } from '../../ui/actionHeader/actionHeader';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Input } from '../../ui/input/input';
import { ContactItem } from '../contactItem/contactItem';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { ChannelDetail } from '../../../services/channelService';
import template from './channelDetailsWindow.hbs';
import './channelDetailsWindow.scss';

const MAX_TITLE_LENGTH = 100;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export interface ChannelDetailsWindowProps {
    channel: ChannelDetail;
    onBack: () => void;
    onLeaveChannel: () => void;
    onDeleteChannel: () => void;
    onChannelUpdated?: () => void;
    onUpdateChannel: (title?: string, description?: string, avatar?: File) => Promise<{ success: boolean; errorCode?: string }>;
    onRemoveMember: (userId: number) => Promise<boolean>;
    onMemberClick?: (userId: number) => void;
    initialIsEditing?: boolean;
}

export class ChannelDetailsWindow extends BaseComponent<ChannelDetailsWindowProps & { isEditing?: boolean }> {
    private headerComponent: ActionHeader | null = null;
    private avatarComponent: Avatar | null = null;
    private nameInput: Input | null = null;
    private actionButtons: Button[] = [];
    private memberComponents: ContactItem[] = [];
    private adminLabels: HTMLElement[] = [];
    private modalComponent: ConfirmModal | null = null;
    private fileInput: HTMLInputElement | null = null;
    private selectedAvatarFile: File | null = null;
    private avatarPreviewUrl: string | null = null;
    private descriptionTextarea: HTMLTextAreaElement | null = null;

    constructor(props: ChannelDetailsWindowProps) {
        super({ ...props, isEditing: props.initialIsEditing || false });
    }

    getTemplate() {
        return template;
    }

    private setEditing(isEditing: boolean): void {
        if (!isEditing) this.cleanupAvatarPreview();
        this.props.isEditing = isEditing;
        const parent = this.element?.parentElement;
        if (parent) {
            this.unmount();
            this.mount(parent);
        }
    }

    private cleanupAvatarPreview(): void {
        if (this.avatarPreviewUrl) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
            this.avatarPreviewUrl = null;
        }
        this.selectedAvatarFile = null;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const headerSlot = this.element.querySelector('[data-component="header-slot"]');
        if (headerSlot) {
            const isOwner = this.props.channel.currentUserRole === 'owner';
            const headerTitle = this.props.isEditing ? 'Изменение канала' : 'Информация о канале';

            this.headerComponent = new ActionHeader({
                backButton: new Button({
                    class: 'create-dialog-window__back-button',
                    label: 'Назад',
                    onClick: () => {
                        if (this.props.isEditing) {
                            this.setEditing(false);
                        } else {
                            this.props.onBack();
                        }
                    },
                }),
                content: headerTitle,
                icon: '/assets/images/icons/createChatMenuIcons/channel.svg',
            });
            this.headerComponent.mount(headerSlot as HTMLElement);
        }

        this.mountAvatar();
        this.mountNameSlot();
        this.mountActions();
        this.mountDescriptionRow();
        this.mountInviteRow();
        this.mountMembers();
    }

    private mountAvatar(): void {
        const avatarSlot = this.element?.querySelector('[data-component="avatar-slot"]') as HTMLElement;
        if (!avatarSlot) return;

        const avatarSrc = this.avatarPreviewUrl
            || this.props.channel.avatarUrl
            || '/assets/images/avatars/defaultGroup.svg';

        this.avatarComponent = new Avatar({
            src: avatarSrc,
            class: 'channel-details__avatar',
        });
        this.avatarComponent.mount(avatarSlot);

        if (this.props.isEditing && this.props.channel.currentUserRole === 'owner') {
            avatarSlot.classList.add('channel-details__avatar-slot--editing');

            const overlay = document.createElement('div');
            overlay.className = 'channel-details__avatar-overlay';
            const cameraIcon = document.createElement('img');
            cameraIcon.src = '../assets/images/icons/photoEdit.svg';
            cameraIcon.className = 'channel-details__camera-icon';
            overlay.appendChild(cameraIcon);
            avatarSlot.appendChild(overlay);

            this.fileInput = document.createElement('input');
            this.fileInput.type = 'file';
            this.fileInput.accept = ALLOWED_AVATAR_TYPES.join(',');
            this.fileInput.style.display = 'none';
            this.element?.appendChild(this.fileInput);

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
                const img = this.element?.querySelector('img.channel-details__avatar') as HTMLImageElement;
                if (img) img.src = this.avatarPreviewUrl;
            });

            avatarSlot.addEventListener('click', () => this.fileInput?.click());
        }
    }

    private mountNameSlot(): void {
        const nameSlot = this.element?.querySelector('[data-component="name-slot"]');
        if (!nameSlot) return;

        if (this.props.isEditing) {
            this.nameInput = new Input({
                class: 'channel-details__name-input',
                value: this.props.channel.title,
                placeholder: 'Название канала',
            });
            this.nameInput.mount(nameSlot as HTMLElement);
        } else {
            const title = document.createElement('h2');
            title.className = 'channel-details__name-text text-xl';
            title.textContent = this.props.channel.title;
            nameSlot.appendChild(title);
        }
    }

    private mountActions(): void {
        const buttonsSlot = this.element?.querySelector('[data-component="actions-slot"]');
        if (!buttonsSlot) return;

        this.actionButtons = [];
        const role = this.props.channel.currentUserRole;
        const isOwner = role === 'owner';

        if (this.props.isEditing && isOwner) {
            const cancelBtn = new Button({
                label: 'Отмена',
                class: 'channel-details__btn ui-button ui-button__secondary2',
                onClick: () => this.setEditing(false),
            });
            cancelBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(cancelBtn);

            const doneBtn = new Button({
                label: 'Готово',
                class: 'channel-details__btn ui-button ui-button__secondary',
                onClick: () => this.handleSubmit(),
            });
            doneBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(doneBtn);
        } else if (isOwner) {
            const editBtn = new Button({
                label: 'Изменить',
                class: 'channel-details__btn ui-button ui-button__secondary2',
                onClick: () => this.setEditing(true),
            });
            editBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(editBtn);

            const deleteBtn = new Button({
                label: 'Удалить канал',
                class: 'channel-details__btn ui-button exit-button',
                onClick: () => this.confirmDeleteChannel(),
            });
            deleteBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(deleteBtn);
        } else if (role === 'participant') {
            const leaveBtn = new Button({
                label: 'Выйти',
                class: 'channel-details__btn ui-button exit-button',
                onClick: () => this.confirmLeaveChannel(),
            });
            leaveBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(leaveBtn);
        }
    }

    private mountDescriptionRow(): void {
        const descriptionSlot = this.element?.querySelector('[data-component="description-slot"]');
        if (!descriptionSlot) return;

        if (this.props.isEditing) {
            const infoRow = this.element?.querySelector('.channel-details__info-row');
            if (infoRow) {
                const label = infoRow.querySelector('.channel-details__info-label');
                if (label) label.textContent = 'Информация о канале:';
                infoRow.removeChild(descriptionSlot);

                this.descriptionTextarea = document.createElement('textarea');
                this.descriptionTextarea.className = 'channel-details__info-textarea';
                this.descriptionTextarea.value = this.props.channel.description || '';
                this.descriptionTextarea.placeholder = 'Описание канала';
                this.descriptionTextarea.rows = 3;
                infoRow.appendChild(this.descriptionTextarea);
            }
        } else {
            descriptionSlot.textContent = this.props.channel.description || '';
        }
    }

    private mountInviteRow(): void {
        const inviteRow = this.element?.querySelector('[data-component="invite-row"]') as HTMLElement;
        if (!inviteRow) return;

        const isOwner = this.props.channel.currentUserRole === 'owner';

        if (!isOwner && !this.props.isEditing) {
            inviteRow.style.display = 'none';
            return;
        }

        const inviteUrlEl = inviteRow.querySelector('[data-component="invite-url"]');
        if (inviteUrlEl) {
            inviteUrlEl.textContent = this.props.channel.inviteUrl;
        }

        inviteRow.addEventListener('click', () => {
            navigator.clipboard?.writeText(this.props.channel.inviteUrl).catch(() => {});
        });
    }

    private mountMembers(): void {
        const membersSlot = this.element?.querySelector('[data-component="members-list-slot"]');
        if (!membersSlot) return;

        this.memberComponents = [];
        this.adminLabels = [];

        const isOwner = this.props.channel.currentUserRole === 'owner';

        this.props.channel.members.forEach(member => {
            let rightControl: BaseComponent<any> | undefined;

            if (this.props.isEditing && isOwner && !member.isOwner) {
                rightControl = new Button({
                    class: 'remove-channel-member-btn',
                    icon: '/assets/images/icons/deleteGroupMember.svg',
                    onClick: () => this.confirmRemoveMember(member),
                });
            } else if (member.isOwner) {
                const label = document.createElement('span');
                label.className = 'channel-details__admin-label';
                label.textContent = 'Администратор';
                this.adminLabels.push(label);

                const item = new ContactItem({
                    id: member.id,
                    name: member.name,
                    avatarUrl: member.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                    onClick: !this.props.isEditing
                        ? () => this.props.onMemberClick?.(member.id)
                        : undefined,
                });
                item.mount(membersSlot as HTMLElement);
                const el = item.element;
                if (el) el.appendChild(label);
                this.memberComponents.push(item);
                return;
            }

            const item = new ContactItem({
                id: member.id,
                name: member.name,
                avatarUrl: member.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                rightSlot: rightControl,
                onClick: !this.props.isEditing
                    ? () => this.props.onMemberClick?.(member.id)
                    : undefined,
            });
            item.mount(membersSlot as HTMLElement);
            this.memberComponents.push(item);
        });
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
        const newTitle = this.nameInput?.value?.trim() || '';
        const titleChanged = newTitle !== '' && newTitle !== this.props.channel.title;
        const avatarChanged = this.selectedAvatarFile !== null;
        const newDescription = this.descriptionTextarea?.value?.trim() ?? this.props.channel.description;
        const descriptionChanged = newDescription !== this.props.channel.description;

        if (titleChanged && newTitle.length > MAX_TITLE_LENGTH) {
            this.showAlert(`Название не должно превышать ${MAX_TITLE_LENGTH} символов`, () => this.setEditing(true));
            return;
        }

        if (!titleChanged && !avatarChanged && !descriptionChanged) {
            this.setEditing(false);
            return;
        }

        this.setLoadingState(true);
        try {
            const res = await this.props.onUpdateChannel(
                titleChanged ? newTitle : undefined,
                descriptionChanged ? newDescription : undefined,
                avatarChanged ? this.selectedAvatarFile! : undefined
            );

            if (res.success) {
                if (titleChanged) this.props.channel.title = newTitle;
                if (descriptionChanged) this.props.channel.description = newDescription;
                this.cleanupAvatarPreview();
                this.setEditing(false);
                this.props.onChannelUpdated?.();
            } else {
                const msg = res.errorCode === 'YOU_CANT_CHANGE_TITLE'
                    ? 'Только владелец канала может менять название'
                    : res.errorCode === 'YOU_CANT_CHANGE_AVATAR'
                        ? 'Только владелец канала может менять аватар'
                        : 'Не удалось сохранить изменения. Попробуйте ещё раз';
                this.showAlert(msg, () => this.setEditing(true));
            }
        } catch {
            this.showAlert('Произошла ошибка при сохранении');
        } finally {
            this.setLoadingState(false);
        }
    }

    private setLoadingState(isLoading: boolean): void {
        const doneBtn = this.actionButtons.find(b => b.props.label === 'Готово');
        const cancelBtn = this.actionButtons.find(b => b.props.label === 'Отмена');
        [doneBtn, cancelBtn].forEach(btn => {
            if (!btn) return;
            btn.props.disabled = isLoading;
            if (btn.element) (btn.element as HTMLButtonElement).disabled = isLoading;
        });
    }

    private confirmDeleteChannel(): void {
        const name = this.props.channel.title.length > 20
            ? this.props.channel.title.substring(0, 20) + '…'
            : this.props.channel.title;

        this.openModal(
            `Вы уверены, что хотите удалить канал "${name}"? Вся история сообщений будет удалена…`,
            'Удалить',
            () => {
                this.closeModal();
                this.props.onDeleteChannel();
            }
        );
    }

    private confirmLeaveChannel(): void {
        this.openModal(
            'Вы точно хотите выйти из канала?',
            'Выйти',
            () => {
                this.closeModal();
                this.props.onLeaveChannel();
            }
        );
    }

    private confirmRemoveMember(member: { id: number; name: string }): void {
        this.openModal(
            `Вы точно хотите исключить участника ${member.name} из канала?`,
            'Удалить',
            async () => {
                this.closeModal();
                const ok = await this.props.onRemoveMember(member.id);
                if (ok) {
                    this.props.channel.members = this.props.channel.members.filter(m => m.id !== member.id);
                    this.setEditing(!!this.props.isEditing);
                }
            }
        );
    }

    private showAlert(text: string, onConfirm?: () => void): void {
        this.closeModal();
        this.modalComponent = new ConfirmModal({
            text,
            confirmButtonText: 'Ок',
            hideCancel: true,
            confirmButtonClass: 'ui-button ui-button__secondary',
            onConfirm: () => {
                this.closeModal();
                onConfirm?.();
            },
        });
        this.modalComponent.mount(document.body);
    }

    private openModal(text: string, confirmText: string, onConfirm: () => void): void {
        this.closeModal();
        this.modalComponent = new ConfirmModal({
            text,
            confirmButtonText: confirmText,
            onConfirm,
            onCancel: () => this.closeModal(),
        });
        this.modalComponent.mount(document.body);
    }

    private closeModal(): void {
        this.modalComponent?.unmount();
        this.modalComponent = null;
    }

    protected beforeUnmount(): void {
        this.headerComponent?.unmount();
        this.avatarComponent?.unmount();
        this.nameInput?.unmount();
        this.actionButtons.forEach(b => b.unmount());
        this.memberComponents.forEach(c => c.unmount());
        this.closeModal();

        if (this.fileInput) {
            this.fileInput.remove();
            this.fileInput = null;
        }
        if (this.avatarPreviewUrl) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
            this.avatarPreviewUrl = null;
        }

        this.headerComponent = null;
        this.avatarComponent = null;
        this.nameInput = null;
        this.actionButtons = [];
        this.memberComponents = [];
        this.descriptionTextarea = null;
    }
}
