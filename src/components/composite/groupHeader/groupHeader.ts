import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { GroupChat } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import template from './groupHeader.hbs'
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';

interface GroupHeaderProps extends IBaseComponentProps {
    chat: GroupChat;
}

export class GroupHeader extends BaseComponent<GroupHeaderProps> {
    private avatarComponent: Avatar | null = null;
    private settingsButton: Button | null = null;
    private deleteChatMenu: DeleteChatMenu | null = null;
    private isDeleteMenuOpen: boolean;

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

    }

    public openInfo() {
        // todo: реализовать отображение информации о чате
    }

    protected beforeUnmount(): void {
        this.avatarComponent?.unmount();
        this.settingsButton?.unmount();
        this.deleteChatMenu?.unmount();
    }   
}