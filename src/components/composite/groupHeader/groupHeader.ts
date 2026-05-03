import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { GroupChat } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import template from './groupHeader.hbs'
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { chatService } from '../../../services/chatService';
import { wsClient, ChatInformationDto } from '../../../core/utils/wsClient';
import { getFullUrl } from '../../../core/utils/url';

interface GroupHeaderProps extends IBaseComponentProps {
    chat: GroupChat;
    onDeleteChat?: () => void;
    onOpenGroupInfo?: () => void;
    onOpenSearch?: () => void;
}

export class GroupHeader extends BaseComponent<GroupHeaderProps> {
    private avatarComponent: Avatar | null = null;
    private searchButton: Button | null = null;
    private settingsButton: Button | null = null;
    private deleteChatMenu: DeleteChatMenu | null = null;
    private confirmModal: ConfirmModal | null = null;
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
        // клик по шапке перебрасывает в инфо
        const headerInfoArea = this.element.querySelector('.group-header__info');
        if (headerInfoArea) {
            headerInfoArea.addEventListener('click', () => this.openInfo());
            (headerInfoArea as HTMLElement).style.cursor = 'pointer';
        }

        const avatarSlot = this.element.querySelector('[data-component="group-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.chat.avatarUrl || '/assets/images/avatars/defaultGroup.svg',
                class: 'group-header__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        const searchSlot = this.element.querySelector('[data-component="group-search-slot"]');
        if (searchSlot) {
            this.searchButton = new Button({
                class: 'group-header__search-btn',
                icon: '/assets/images/icons/searchIcon.svg',
                title: 'Поиск',
                onClick: () => this.props.onOpenSearch?.(),
            });
            this.searchButton.mount(searchSlot as HTMLElement);
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
                                this.deleteChatMenu?.unmount();
                                this.isDeleteMenuOpen = false;
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

        // Загружаем количество участников, если это группа
        this.loadMemberCount();

        wsClient.subscribe<ChatInformationDto>('chat.Updated', this.handleChatUpdated);
    }

    /**
     * Обработчик события обновления чата через WebSocket.
     * Обновляет название и аватарку в шапке, если ID совпадает.
     * @param {ChatInformationDto} payload - Данные обновленного чата.
     * @private
     */
    private handleChatUpdated = (payload: ChatInformationDto): void => {
        if (this.props.chat && String(this.props.chat.id) === String(payload.id)) {
            const nameEl = this.element?.querySelector('.group-header__name');
            if (nameEl) {
                nameEl.textContent = payload.title;
            }

            const avatarImg = this.element?.querySelector('.group-header__avatar') as HTMLImageElement;
            if (avatarImg && payload.avatar) {
                avatarImg.src = getFullUrl(payload.avatar);
            }
        }
    };

    /**
     * Загружает количество участников группы и обновляет UI.
     */
    private async loadMemberCount(): Promise<void> {
        if (!this.element) return;
        
        const countElement = this.element.querySelector('.group-header__members');
        if (!countElement) return;

        const members = await chatService.getChatMembers(this.props.chat.id);
        const count = members.length;
        
        countElement.textContent = `${count} ${this.getMemberWord(count)}`;
    }

    /**
     * Возвращает правильную форму слова "участник"
     */
    private getMemberWord(count: number): string {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
            return 'участников';
        }
        if (lastDigit === 1) {
            return 'участник';
        }
        if (lastDigit >= 2 && lastDigit <= 4) {
            return 'участника';
        }
        return 'участников';
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
            const displayName = this.props.chat.title.length > 20 
                ? this.props.chat.title.substring(0, 20) + '...' 
                : this.props.chat.title;

            this.confirmModal = new ConfirmModal({
                text: `Вы действительно хотите удалить группу "${displayName}"?`,
                confirmButtonText: "Удалить",
                onCancel: () => {
                    this.isDeleteConfirmationOpen = false;
                    this.confirmModal?.unmount();
                    this.confirmModal = null;
                },
                onConfirm: () => {
                    if (this.props.onDeleteChat) {
                        this.props.onDeleteChat(); 
                    }
                    this.isDeleteConfirmationOpen = false;
                    this.confirmModal?.unmount();
                    this.confirmModal = null;
                }
            });
            this.confirmModal.mount(deleteMenuContainer as HTMLElement);
            this.isDeleteConfirmationOpen = true;
        }
    }

    public openInfo() {
        if (this.props.onOpenGroupInfo) {
            this.props.onOpenGroupInfo();
        }
    }

    protected beforeUnmount(): void {
        this.avatarComponent?.unmount();
        this.searchButton?.unmount();
        this.settingsButton?.unmount();
        this.deleteChatMenu?.unmount();
        this.confirmModal?.unmount();

        wsClient.unsubscribe('chat.Updated', this.handleChatUpdated);
    }
}