import { BaseComponent } from '../../../core/base/baseComponent';
import { ContactItem } from '../contactItem/contactItem';
import { Button } from '../../ui/button/button';
import { Avatar } from '../../ui/avatar/avatar';
import { Input } from '../../ui/input/input';
import { ActionHeader } from '../../ui/actionHeader/actionHeader';
import template from './groupDetailsWindow.hbs';
import './groupDetailsWindow.css';
import { ConfirmModal } from '../confirmModal/confirmModal';

interface GroupMember {
    id: number;
    login: string;
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
    onUpdateGroup: (newName: string, newAvatar?: File) => void;
    onRemoveMember: (userId: number) => void;
    onAddMember: () => void;
}

/**
 * @class GroupDetailsWindow
 * @description Умный компонент для отображения и редактирования информации о группе.
 * Использует паттерн динамического монтажа компонентов в слоты после рендеринга шаблона.
 */
export class GroupDetailsWindow extends BaseComponent<GroupDetailsWindowProps & { isEditing?: boolean }> {
    private headerComponent: ActionHeader | null = null;
    private avatarComponent: Avatar | null = null;
    private nameInput: Input | null = null;
    private membersComponents: ContactItem[] = [];
    private actionButtons: Button[] = [];
    private modalComponent: ConfirmModal | null = null;
    
    constructor(props: GroupDetailsWindowProps) {
        super({ ...props, isEditing: false });
    }

    getTemplate() {
        return template;
    }

    /**
     * @description Изменяет состояние редактирования и перерисовывает компонент.
     * @param isEditing
     */
    private setEditing(isEditing: boolean) {
        this.props.isEditing = isEditing;
        const parent = this.element?.parentElement;
        if (parent) {
            this.unmount();
            this.mount(parent);
        }
    }

    protected afterMount(): void {
        if (!this.element) return;

        const headerSlot = this.element?.querySelector('[data-component="header-slot"]');

        this.headerComponent = new ActionHeader({
            backButton: new Button({
                class: "back-button group-details__back-button",
                label: "",
                type: "submit",
                icon: "/assets/images/icons/backArrow.svg",
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
            this.avatarComponent = new Avatar({
                src: this.props.groupAvatarUrl || "/assets/images/avatars/defaultAvatar.svg",
                class: "group-details__avatar"
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);

            if (this.props.isEditing) {
                const overlay = document.createElement('div');
                overlay.className = 'group-details__avatar-overlay';
                avatarSlot.appendChild(overlay);
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
                class: "group-details__btn ui-button__secondary2",
                onClick: () => this.setEditing(false)
            });
            cancelBtn.mount(buttonsSlot as HTMLElement);
            
            this.actionButtons.push(cancelBtn);
                        const doneBtn = new Button({
                label: "Готово",
                class: "group-details__btn ui-button__secondary",
                onClick: () => {
                    const newName = this.nameInput?.value.trim();
                    if (newName && newName !== '') {
                        this.props.onUpdateGroup(newName);
                        this.props.groupName = newName;
                    }
                    this.setEditing(false);
                }
            });
            doneBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(doneBtn);
        } else {
            // Если владелец, показываем кнопку редактирования
            if (this.props.currentUserRole === 'owner') {
                const addBtn = new Button({
                    label: "Добавить",
                    class: "group-details__btn ui-button__secondary",
                    onClick: () => this.props.onAddMember()
                });
                addBtn.mount(buttonsSlot as HTMLElement);
                this.actionButtons.push(addBtn);
            }

            if (this.props.currentUserRole === 'owner') {
                const editBtn = new Button({
                    label: "Изменить",
                    class: "group-details__btn ui-button__secondary2",
                    onClick: () => this.setEditing(true)
                });
                editBtn.mount(buttonsSlot as HTMLElement);
                this.actionButtons.push(editBtn);
            }

            const leaveBtn = new Button({
                label: "Выйти",
                class: "group-details__btn exit-button",
                onClick: () => this.confirmLeaveGroup()
            });
            leaveBtn.mount(buttonsSlot as HTMLElement);
            this.actionButtons.push(leaveBtn);


        }

        const membersSlot = this.element?.querySelector('[data-component="members-list-slot"]');
        if (!membersSlot) return;

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
                name: member.login,
                avatarUrl: member.avatarUrl || '/assets/images/avatars/chatAvatar.svg',
                rightSlot: rightControl
            });

            item.mount(membersSlot as HTMLElement);
            this.membersComponents.push(item);
        });
    }

    private confirmLeaveGroup(): void {
        this.openModal(
            "Вы точно хотите покинуть группу? Это действие нельзя будет отменить",
            "Выйти",
            () => {
                this.closeModal();
                this.props.onLeaveGroup();
            }
        );
    }

    private confirmRemoveMember(member: GroupMember): void {
        this.openModal(
            `Вы точно хотите исключить участника ${member.login} из группы?`,
            "Удалить",
            () => {
                this.closeModal();
                this.props.onRemoveMember(member.id);
                this.props.members = this.props.members.filter(m => m.id !== member.id);
                this.setEditing(this.props.isEditing || false);
            }
        );
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

        this.headerComponent = null;
        this.avatarComponent = null;
        this.nameInput = null;
        this.actionButtons = [];
        this.membersComponents = [];
    }
}
