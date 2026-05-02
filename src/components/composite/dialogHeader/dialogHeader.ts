import { BaseComponent } from '../../../core/base/baseComponent';
import { User, DialogChat } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import template from './dialogHeader.hbs';
import { getFullUrl } from '../../../core/utils/url';
import { Button } from '../../ui/button/button';
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { wsClient, ChatInformationDto } from '../../../core/utils/wsClient';

/**
 * @interface DialogHeaderProps - Свойства компонента шапки диалога.
 * @property {DialogChat} chat - Объект диалогового чата.
 */
interface DialogHeaderProps {
    chat: DialogChat;
    onDeleteChat?: () => void;
    onOpenProfile: () => void;
    onOpenSearch?: () => void;
}

/**
 * Компонент шапки для личного диалога.
 * Отображает аватар, имя собеседника и его статус.
 */
export class DialogHeader extends BaseComponent {
    private avatarComponent: Avatar | null = null;
    private searchButton: Button | null = null;
    private settingsButton: Button | null = null;
    private deleteChatMenu: DeleteChatMenu | null = null;
    private confirmModal: ConfirmModal | null = null;
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

        const nameEl = this.element.querySelector('.dialog-header__name');
        if (nameEl) {
            nameEl.addEventListener('click', this.handleOpenProfile);
        }

        const searchSlot = this.element.querySelector('[data-component="dialog-search-slot"]');
        if (searchSlot) {
            this.searchButton = new Button({
                class: 'dialog-header__search-btn',
                icon: '/assets/images/icons/searchIcon.svg',
                title: 'Поиск',
                onClick: () => this.props.onOpenSearch?.(),
            });
            this.searchButton.mount(searchSlot as HTMLElement);
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
                        this.deleteChatMenu = new DeleteChatMenu({
                            typeChat: "dialog",
                            onInfo: () => {
                                this.props.onOpenProfile();
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
            const nameEl = this.element?.querySelector('.dialog-header__name');
            if (nameEl) {
                nameEl.textContent = payload.title;
            }

            const avatarImg = this.element?.querySelector('.dialog-header__avatar') as HTMLImageElement;
            if (avatarImg && payload.avatar) {
                avatarImg.src = getFullUrl(payload.avatar);
            }
        }
    };

    /**
     * Обработчик открытия профиля.
     * @private
     */
    private handleOpenProfile = () => {
        const props = this.props as DialogHeaderProps;
        props.onOpenProfile();
    };

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
            this.confirmModal = new ConfirmModal({
                text: "Вы точно хотите удалить чат?",
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

    protected beforeUnmount() {
        const nameEl = this.element?.querySelector('.dialog-header__name');
        if (nameEl) {
            nameEl.removeEventListener('click', this.handleOpenProfile);
        }

        this.avatarComponent?.unmount();
        this.searchButton?.unmount();
        this.settingsButton?.unmount();
        this.deleteChatMenu?.unmount();
        this.confirmModal?.unmount();

        wsClient.unsubscribe('chat.Updated', this.handleChatUpdated);
    }
}