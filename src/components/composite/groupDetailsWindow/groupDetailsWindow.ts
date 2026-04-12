import { BaseComponent } from '../../../core/base/baseComponent';
import { ContactItem } from '../contactItem/contactItem';
import { Button } from '../../ui/button/button';
import { Avatar } from '../../ui/avatar/avatar';
import { Input } from '../../ui/input/input';
import { ActionHeader } from '../../ui/actionHeader/actionHeader';
import template from './groupDetailsWindow.hbs';
import './groupDetailsWindow.scss';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { chatService } from '../../../services/chatService';


const MAX_TITLE_LENGTH = 100;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

interface GroupMember {
    id: number;
    name: string;
    avatarUrl?: string;
}

export interface GroupDetailsWindowProps {
    groupId: string;
    groupName: string;
    groupAvatarUrl: string;
    currentUserRole: 'member' | 'owner';
    members: GroupMember[];
    onBack: () => void;
    onLeaveGroup: () => void;

    /** @deprecated Заменён на onGroupUpdated. Оставлен для обратной совместимости. */
    onUpdateGroup?: (newName: string, newAvatar?: File) => void;

    /** Вызывается после успешного обновления группы на сервере */
    onGroupUpdated?: () => void;
    onRemoveMember: (userId: number) => Promise<boolean>;
    onAddMember: () => void;
    onMemberClick?: (userId: number) => void;
    initialIsEditing?: boolean;
}

/**
 * @class GroupDetailsWindow
 * @description Умный компонент для отображения и редактирования информации о группе.
 * Поддерживает изменение названия и аватарки с клиентской валидацией,
 * использует реальные API-запросы через chatService.
 */
export class GroupDetailsWindow extends BaseComponent<GroupDetailsWindowProps & { isEditing?: boolean; isSaving?: boolean }> {
    private headerComponent: ActionHeader | null = null;
    private avatarComponent: Avatar | null = null;
    private nameInput: Input | null = null;
    private membersComponents: ContactItem[] = [];
    private actionButtons: Button[] = [];
    private modalComponent: ConfirmModal | null = null;

    /** Скрытый input для выбора файла аватарки */
    private fileInput: HTMLInputElement | null = null;
    
    /** Выбранный файл аватарки (в режиме редактирования) */
    private selectedAvatarFile: File | null = null;

    /** URL превью выбранной аватарки (для отображения до отправки) */
    private avatarPreviewUrl: string | null = null;

    constructor(props: GroupDetailsWindowProps) {
        super({ ...props, isEditing: props.initialIsEditing || false });
    }

    getTemplate() {
        return template;
    }

    /**
     * Переключает режим редактирования и перемонтирует компонент.
     * @param isEditing — Новое состояние режима.
     */
    private setEditing(isEditing: boolean) {
        // Сбрасываем выбранный файл при выходе из режима редактирования
        if (!isEditing) {
            this.cleanupAvatarPreview();
        }
        this.props.isEditing = isEditing;
        const parent = this.element?.parentElement;
        if (parent) {
            this.unmount();
            this.mount(parent);
        }
    }

    /**
     * Очищает превью аватарки и освобождает Object URL.
     */
    private cleanupAvatarPreview(): void {
        if (this.avatarPreviewUrl) {
            URL.revokeObjectURL(this.avatarPreviewUrl);
            this.avatarPreviewUrl = null;
        }
        this.selectedAvatarFile = null;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const headerSlot = this.element?.querySelector('[data-component="header-slot"]');

        this.headerComponent = new ActionHeader({
            backButton: new Button({
                class: "create-dialog-window__back-button",
                label: "Назад",
                onClick: () => {
                    if (this.props.isEditing) {
                        this.setEditing(false);
                    } else {
                        this.props.onBack();
                    }
                }
            }),
            content: this.props.isEditing ? "Изменение группы" : "Информация о группе"
        });

        this.headerComponent.mount(headerSlot as HTMLElement);

        const avatarSlot = this.element?.querySelector('[data-component="avatar-slot"]');
        const nameSlot = this.element?.querySelector('[data-component="name-slot"]');

        if (avatarSlot) {
            const avatarSrc = this.avatarPreviewUrl
                || this.props.groupAvatarUrl
                || "/assets/images/avatars/defaultAvatar.svg";

            this.avatarComponent = new Avatar({
                src: avatarSrc,
                class: "group-details__avatar"
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);

            if (this.props.isEditing) {
                avatarSlot.classList.add('group-details__avatar-slot--editing');
                const overlay = document.createElement('div');
                overlay.className = 'group-details__avatar-overlay';
                
                const cameraIcon = document.createElement('img');
                cameraIcon.src = '../assets/images/icons/photoEdit.svg';
                cameraIcon.className = 'group-details__camera-icon';
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

                    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
                        this.showAlert('Недопустимый формат файла. Разрешены: jpeg, jpg, png, webp, gif.', () => {
                            this.setEditing(true);
                        });
                        return;
                    }

                    if (file.size > MAX_AVATAR_SIZE) {
                        this.showAlert('Файл слишком большой. Максимальный размер — 5 МБ.', () => {
                            this.setEditing(true);
                        });
                        return;
                    }

                    this.selectedAvatarFile = file;

                    if (this.avatarPreviewUrl) {
                        URL.revokeObjectURL(this.avatarPreviewUrl);
                    }
                    this.avatarPreviewUrl = URL.createObjectURL(file);

                    const avatarImg = this.element?.querySelector('.group-details__avatar img') as HTMLImageElement;
                    if (avatarImg) {
                        avatarImg.src = this.avatarPreviewUrl;
                    }
                });

                (avatarSlot as HTMLElement).style.cursor = 'pointer';
                (avatarSlot as HTMLElement).addEventListener('click', () => {
                    this.fileInput?.click();
                });
            }
        }

        if (nameSlot) {
            if (this.props.isEditing) {
                this.nameInput = new Input({
                    class: "group-details__name-input",
                    value: this.props.groupName,
                    placeholder: "Введите название группы"
                });
                this.nameInput.mount(nameSlot as HTMLElement);
            } else {
                const title = document.createElement('h2');
                title.className = 'group-details__name-text text-xl';
                title.textContent = this.props.groupName;
                nameSlot.appendChild(title);
            }
        }

        const buttonsSlot = this.element?.querySelector('[data-component="actions-slot"]');
        if (!buttonsSlot) return;

        this.actionButtons = [];

        if (this.props.isEditing) {
            const cancelBtn = new Button({
                label: "Отмена",
                class: "group-details__btn ui-button ui-button__secondary2",
                onClick: () => this.setEditing(false)
            });
            cancelBtn.mount(buttonsSlot as HTMLElement);
            
            this.actionButtons.push(cancelBtn);
            const doneBtn = new Button({
                label: "Готово",
                class: "group-details__btn ui-button ui-button__secondary",
                onClick: () => this.handleSubmit()
            });
            doneBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(doneBtn);
        } else {
            // Если владелец, показываем кнопку редактирования
            if (this.props.currentUserRole === 'owner') {
                const addBtn = new Button({
                    label: "Добавить",
                    class: "group-details__btn ui-button ui-button__secondary",
                    onClick: () => this.props.onAddMember()
                });
                addBtn.mount(buttonsSlot as HTMLElement);
                this.actionButtons.push(addBtn);
            }

            if (this.props.currentUserRole === 'owner') {
                const editBtn = new Button({
                    label: "Изменить",
                    class: "group-details__btn ui-button ui-button__secondary2",
                    onClick: () => this.setEditing(true)
                });
                editBtn.mount(buttonsSlot as HTMLElement);
                this.actionButtons.push(editBtn);
            }

            const leaveBtn = new Button({
                label: "Выйти",
                class: "group-details__btn ui-button exit-button",
                onClick: () => this.confirmLeaveGroup()
            });
            leaveBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(leaveBtn);


        }

        const membersSlot = this.element?.querySelector('[data-component="members-list-slot"]');
        if (!membersSlot) return;

        const membersTitle = this.element?.querySelector('.group-details__members-title');
        if (membersTitle) {
            const count = this.props.members.length;
            membersTitle.textContent = `Участники (${count})`;
        }

        this.membersComponents = [];

        this.props.members.forEach(member => {
            let rightControl: BaseComponent<any> | undefined = undefined;

            if (this.props.isEditing && this.props.currentUserRole === 'owner') {
                rightControl = new Button({
                    class: "remove-member-btn",
                    icon: "/assets/images/icons/deleteGroupMember.svg",
                    onClick: () => this.confirmRemoveMember(member)
                });
            }

            const item = new ContactItem({
                id: member.id,
                name: member.name,
                avatarUrl: member.avatarUrl || '/assets/images/avatars/chatAvatar.svg',
                rightSlot: rightControl,
                onClick: !this.props.isEditing ? () => {
                    if (this.props.onMemberClick) {
                        this.props.onMemberClick(member.id);
                    }
                } : undefined
            });

            item.mount(membersSlot as HTMLElement);
            this.membersComponents.push(item);
        });
    }

    /**
     * Обработчик нажатия кнопки «Готово» в режиме редактирования.
     * Определяет, что изменилось (название/аватарка/оба), выполняет валидацию
     * и отправляет соответствующие API-запросы через chatService.
     */
    private async handleSubmit(): Promise<void> {
        const newName = this.nameInput?.value.trim() || '';
        const titleChanged = newName !== '' && newName !== this.props.groupName;
        const avatarChanged = this.selectedAvatarFile !== null;

        if (titleChanged) {
            if (newName.length > MAX_TITLE_LENGTH) {
                this.showAlert(`Название группы не должно превышать ${MAX_TITLE_LENGTH} символов.`, () => {
                    this.setEditing(true);
                });
                return;
            }
        }

        if (!titleChanged && !avatarChanged) {
            this.setEditing(false);
            return;
        }

        const promises: Promise<boolean>[] = [];

        if (titleChanged) {
            promises.push(chatService.updateChatTitle(this.props.groupId, newName));
        }
        if (avatarChanged && this.selectedAvatarFile) {
            promises.push(chatService.updateChatAvatar(this.props.groupId, this.selectedAvatarFile));
        }

        this.setLoadingState(true);
        try {
            const results = await Promise.all(promises);
            const allSuccess = results.every(r => r === true);

            if (allSuccess) {
                if (titleChanged) {
                    this.props.groupName = newName;
                }

                this.cleanupAvatarPreview();
                this.setEditing(false);

                if (this.props.onGroupUpdated) {
                    this.props.onGroupUpdated();
                }
            } else {
                this.showAlert('Не удалось сохранить изменения. Попробуйте ещё раз.', () => {
                    this.setEditing(true);
                });
            }
        } catch (error) {
            console.error("Ошибка при сохранении группы:", error);
            this.showAlert('Произошла ошибка при сохранении. Проверьте подключение к сети.');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Устанавливает визуальное состояние загрузки.
     * @param {boolean} isLoading - Флаг загрузки.
     * @private
     */
    private setLoadingState(isLoading: boolean): void {
        if (!this.element) return;

        const avatarSlot = this.element.querySelector('.group-details__avatar-slot');
        const submitBtn = this.actionButtons.find(b => b.props.label === "Готово");
        const cancelBtn = this.actionButtons.find(b => b.props.label === "Отмена");

        if (isLoading) {
            avatarSlot?.classList.add('group-details__avatar-slot--loading');
            if (submitBtn) submitBtn.props.disabled = true;
            if (cancelBtn) cancelBtn.props.disabled = true;
            
            const overlay = avatarSlot?.querySelector('.group-details__avatar-overlay');
            if (overlay && !overlay.querySelector('.group-details__loader')) {
                const loader = document.createElement('div');
                loader.className = 'group-details__loader';
                overlay.appendChild(loader);
            }
        } else {
            avatarSlot?.classList.remove('group-details__avatar-slot--loading');
            if (submitBtn) submitBtn.props.disabled = false;
            if (cancelBtn) cancelBtn.props.disabled = false;
            
            const loader = avatarSlot?.querySelector('.group-details__loader');
            loader?.remove();
        }
        this.actionButtons.forEach(btn => {
            if (btn.element) {
                (btn.element as HTMLButtonElement).disabled = btn.props.disabled || false;
            }
        });
    }

    private confirmLeaveGroup(): void {
        const displayName = this.props.groupName.length > 20 
            ? this.props.groupName.substring(0, 20) + '...' 
            : this.props.groupName;

        this.openModal(
            `Вы действительно хотите покинуть группу "${displayName}"? Это действие нельзя будет отменить`,
            "Выйти",
            () => {
                this.closeModal();
                this.props.onLeaveGroup();
            }
        );
    }

    private confirmRemoveMember(member: GroupMember): void {
        this.openModal(
            `Вы точно хотите исключить участника ${member.name} из группы?`,
            "Удалить",
            async () => {
                this.closeModal();
                const isSuccess = await this.props.onRemoveMember(member.id);
                
                if (isSuccess) {
                    this.props.members = this.props.members.filter(m => m.id !== member.id);
                    this.setEditing(this.props.isEditing || false);
                }
            }
        );
    }

    private showAlert(text: string, onConfirm?: () => void): void {
        this.closeModal();
        this.modalComponent = new ConfirmModal({
            text: text,
            confirmButtonText: "Ок",
            hideCancel: true,
            confirmButtonClass: "ui-button ui-button__secondary",
            onConfirm: () => {
                this.closeModal();
                if (onConfirm) {
                    onConfirm();
                }
            }
        });
        this.modalComponent.mount(document.body);
    }

    private openModal(text: string, confirmText: string, onConfirm: () => void): void {
        this.closeModal();
        this.modalComponent = new ConfirmModal({
            text: text,
            confirmButtonText: confirmText,
            onConfirm: onConfirm,
            onCancel: () => this.closeModal()
        });
        this.modalComponent.mount(document.body);
    }

    private closeModal(): void {
        if (this.modalComponent) {
            this.modalComponent.unmount();
            this.modalComponent = null;
        }
    }

    protected beforeUnmount(): void {
        this.headerComponent?.unmount();
        this.avatarComponent?.unmount();
        this.nameInput?.unmount();
        this.actionButtons.forEach(b => b.unmount());
        this.membersComponents.forEach(c => c.unmount());
        this.closeModal();

        if (this.fileInput) {
            this.fileInput.remove();
            this.fileInput = null;
        }

        this.headerComponent = null;
        this.avatarComponent = null;
        this.nameInput = null;
        this.actionButtons = [];
        this.membersComponents = [];
    }
}
