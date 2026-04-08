import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { GroupChat } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import template from './groupHeader.hbs'
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';
import { DeleteMenu } from '../deleteMenu/deleteMenu';

interface GroupHeaderProps extends IBaseComponentProps {
    chat: GroupChat;
    onDeleteChat?: () => void;
}

export class GroupHeader extends BaseComponent<GroupHeaderProps> {
    private avatarComponent: Avatar | null = null;
    private settingsButton: Button | null = null;
    private deleteChatMenu: DeleteChatMenu | null = null;
    private deleteMenu: DeleteMenu | null = null;
    private isDeleteMenuOpen: boolean = false;
    private isDeleteConfirmationOpen: boolean = false;

    constructor(props: GroupHeaderProps) {
        super(props);
        this.tempName = 'components/composite/groupHeader/groupHeader';
    }

    getTemplate() {
        return template;
    }
    
    public afterMount(): void {
        if (!this.element) {
            console.error("groupHeader: нет эллемента для монтирования");
            return;
        }
        const avatarSlot = this.element.querySelector('[data-component="group-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.chat.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'group-header__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        const settingsSlot = this.element.querySelector('[data-component="group-settings-slot"]');
        if (settingsSlot) {
            this.settingsButton = new Button({
                label: "",
                class: "group-header__settings",
                type: "button",
                icon: "/assets/images/icons/dialogSettings.svg",
                onClick: () => {
                    if (!this.isDeleteMenuOpen) {
                        console.log("Открытие меню настроек диалога");
                        this.deleteChatMenu = new DeleteChatMenu({
                            typeChat: "group",
                            onInfo: () => {
                                this.openInfo();
                            },
                            onDelete: () => {
                                this.openDeleteMenu();
                            },
                            onClose: () => {
                                this.isDeleteMenuOpen = false;
                                this.deleteChatMenu?.unmount();
                                this.deleteChatMenu = null;
                            },
                        });
                        this.deleteChatMenu.mount(settingsSlot as HTMLElement);
                        this.isDeleteMenuOpen = true;
                    }
                }
            });
            this.settingsButton.mount(settingsSlot as HTMLElement);
        }
    }


    public openDeleteMenu() {
        if (!this.element) {
            console.error("groupHeader: нет элемента для отображения меню удаления");
            return;
        }
        this.isDeleteMenuOpen = false;
        this.deleteChatMenu?.unmount();
        this.deleteChatMenu = null;
        
        if (!this.isDeleteConfirmationOpen) {
            const deleteMenuContainer = this.element.querySelector('[data-component="group-settings-slot"]');
            this.deleteMenu = new DeleteMenu({
                onClose: () => {
                    this.isDeleteConfirmationOpen = false;
                    this.deleteMenu?.unmount();
                    this.deleteMenu = null;
                },
                onSubmitDelete: () => {
                    if (this.props.onDeleteChat) {
                        this.props.onDeleteChat(); 
                    }
                    this.isDeleteConfirmationOpen = false;
                    this.deleteMenu?.unmount();
                    this.deleteMenu = null;
                }
            });
            this.deleteMenu.mount(deleteMenuContainer as HTMLElement);
            this.isDeleteConfirmationOpen = true;
        }
    }

    public openInfo() {
        // todo: реализовать отображение информации о чате
    }

    protected beforeUnmount(): void {
        this.avatarComponent?.unmount();
        this.settingsButton?.unmount();
        this.deleteChatMenu?.unmount();
        this.deleteMenu?.unmount();
    }   
}