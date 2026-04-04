import { BaseComponent } from '../../../core/base/baseComponent';
import { User, DialogChat } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import template from './dialogHeader.hbs';
import { Button } from '../../ui/button/button';
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';
import { DeleteMenu } from '../deleteMenu/deleteMenu';

/**
 * @interface DialogHeaderProps - Свойства компонента шапки диалога.
 * @property {DialogChat} chat - Объект диалогового чата.
 */
interface DialogHeaderProps {
    chat: DialogChat;
}

/**
 * Компонент шапки для личного диалога.
 * Отображает аватар, имя собеседника и его статус.
 */
export class DialogHeader extends BaseComponent {
    private avatarComponent: Avatar | null = null;
    private settingsButton: Button | null = null;
    private deleteChatMenu: DeleteChatMenu | null = null;
    private deleteMenu: DeleteMenu | null = null;
    isDeleteMenuOpen: boolean = false;
    isDeleteConfirmationOpen: boolean = false;

    /**
     * @param {DialogHeaderProps} props - Свойства компонента.
     */
    constructor(props: DialogHeaderProps) {
        super(props);
        this.props.chat = props.chat;
    }

    getTemplate() {
        return template;
    }

    /**
     * @override
     */
    protected afterMount() {
        if (!this.element) {
            console.error("dialogHeader: нет эллемента для монтирования");
            return;
        }
        const avatarSlot = this.element.querySelector('[data-component="dialog-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.chat.avatarUrl || '/assets/images/avatars/defaultAvatar.svg',
                class: 'dialog-header__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        const settingsSlot = this.element.querySelector('[data-component="dialog-settings-slot"]');
        if (settingsSlot) {
            this.settingsButton = new Button({
                class: "dialog-header__settings",
                label: "",
                icon: "/assets/images/icons/dialogSettings.svg",
                type: "button",
                onClick: () => {
                    if (!this.isDeleteMenuOpen) {
                        console.log("Открытие меню настроек диалога");
                        this.deleteChatMenu = new DeleteChatMenu({
                            typeChat: "dialog",
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
            })
            this.settingsButton.mount(settingsSlot as HTMLElement);
        }
    }

    public openDeleteMenu() {
        if (!this.element) {
            console.error("dialogHeader: нет эллемента для отображения меню удаления");
            return;
        }
        this.isDeleteMenuOpen = false;
        this.deleteChatMenu?.unmount();
        this.deleteChatMenu = null;
        
        if (!this.isDeleteConfirmationOpen) {
            const deleteMenuContainer = this.element.querySelector('[data-component="dialog-settings-slot"]');
            this.deleteMenu = new DeleteMenu({
                onClose: () => {
                    this.isDeleteConfirmationOpen = false;
                    this.deleteMenu?.unmount();
                    this.deleteMenu = null;
                },
                onSubmitDelete: () => {
                    console.log("Подтверждение удаления диалога");
                    // todo реализовать удаление диалога
                }
            });
            this.deleteMenu.mount(deleteMenuContainer as HTMLElement);
            this.isDeleteConfirmationOpen = true;

        }
    }

    public openInfo() {
        // todo: реализовать отображение информации о чате
    }

    protected beforeUnmount() {
        this.avatarComponent?.unmount();
        this.settingsButton?.unmount();
    }
}