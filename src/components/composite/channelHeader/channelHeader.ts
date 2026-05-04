import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { ChannelChat } from '../../../types/chat';
import { ChannelRole } from '../../../services/channelService';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';
import {
    wsClient,
    ChatUpdatedAvatarDto,
    ChatUpdatedTitleDto,
    ChatUpdatedMembersDto,
} from '../../../core/utils/wsClient';
import { getFullUrl } from '../../../core/utils/url';
import template from './channelHeader.hbs';
import './channelHeader.scss';

interface ChannelHeaderProps extends IBaseComponentProps {
    chat: ChannelChat;
    currentUserRole: ChannelRole;
    onDeleteChat?: () => void;
    onLeaveChannel?: () => void;
    onOpenChannelInfo?: () => void;
    onOpenSearch?: () => void;
}

export class ChannelHeader extends BaseComponent<ChannelHeaderProps> {
    private avatarComponent: Avatar | null = null;
    private searchButton: Button | null = null;
    private settingsButton: Button | null = null;
    private deleteChatMenu: DeleteChatMenu | null = null;
    private confirmModal: ConfirmModal | null = null;
    private isDeleteMenuOpen = false;
    private isConfirmOpen = false;

    constructor(props: ChannelHeaderProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const infoArea = this.element.querySelector('.channel-header__info');
        if (infoArea) {
            infoArea.addEventListener('click', () => this.props.onOpenChannelInfo?.());
        }

        const avatarSlot = this.element.querySelector('[data-component="channel-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: this.props.chat.avatarUrl || '/assets/images/avatars/defaultGroup.svg',
                class: 'channel-header__avatar',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        this.loadSubscribersCount();

        const searchSlot = this.element.querySelector('[data-component="channel-search-slot"]');
        if (searchSlot) {
            this.searchButton = new Button({
                label: '',
                class: 'channel-header__search-btn',
                icon: '/assets/images/icons/searchIcon.svg',
                title: 'Поиск',
                onClick: () => this.props.onOpenSearch?.(),
            });
            this.searchButton.mount(searchSlot as HTMLElement);
        }

        const settingsSlot = this.element.querySelector('[data-component="channel-settings-slot"]');
        if (settingsSlot) {
            const isOwner = this.props.currentUserRole === 'owner';
            const isGuest = this.props.currentUserRole === 'guest';

            this.settingsButton = new Button({
                label: '',
                class: 'channel-header__settings-btn',
                icon: '/assets/images/icons/dialogSettings.svg',
                title: 'Действия с каналом',
                onClick: () => {
                    if (this.isDeleteMenuOpen) return;

                    this.deleteChatMenu = new DeleteChatMenu({
                        typeChat: 'channel',
                        deleteLabel: isOwner ? 'Удалить канал' : 'Покинуть канал',
                        infoOnly: isGuest,
                        onInfo: () => {
                            this.props.onOpenChannelInfo?.();
                            this.closeChatMenu();
                        },
                        onDelete: () => {
                            this.closeChatMenu();
                            if (isOwner) {
                                this.openDeleteConfirm();
                            } else {
                                this.openLeaveConfirm();
                            }
                        },
                        onClose: () => this.closeChatMenu(),
                    });
                    this.deleteChatMenu.mount(settingsSlot as HTMLElement);
                    this.isDeleteMenuOpen = true;
                },
            });
            this.settingsButton.mount(settingsSlot as HTMLElement);
        }

        wsClient.subscribe<ChatUpdatedAvatarDto>('chat.Updated.Avatar', this.handleAvatarUpdated);
        wsClient.subscribe<ChatUpdatedTitleDto>('chat.Updated.Title', this.handleTitleUpdated);
        wsClient.subscribe<ChatUpdatedMembersDto>('chat.Updated.Members', this.handleMembersUpdated);
    }

    private isTargetChat(chatId: number): boolean {
        return !!this.element && String(this.props.chat.id) === String(chatId);
    }

    private handleAvatarUpdated = (payload: ChatUpdatedAvatarDto): void => {
        if (!this.isTargetChat(payload.chat_id)) return;
        const avatarImg = this.element!.querySelector('.channel-header__avatar') as HTMLImageElement;
        if (avatarImg) {
            avatarImg.src = payload.avatar_url
                ? getFullUrl(payload.avatar_url)
                : '/assets/images/avatars/defaultGroup.svg';
        }
        this.props.chat.avatarUrl = payload.avatar_url;
    };

    private handleTitleUpdated = (payload: ChatUpdatedTitleDto): void => {
        if (!this.isTargetChat(payload.chat_id)) return;
        const nameEl = this.element!.querySelector('.channel-header__name');
        if (nameEl) nameEl.textContent = payload.title;
        this.props.chat.title = payload.title;
    };

    private handleMembersUpdated = (payload: ChatUpdatedMembersDto): void => {
        if (!this.isTargetChat(payload.chat_id)) return;

        const delta = payload.updated_members_id.length;
        const current = this.props.chat.subscribersCount || 0;
        this.props.chat.subscribersCount = payload.type === 'added'
            ? current + delta
            : Math.max(0, current - delta);

        this.loadSubscribersCount();
    };

    private async loadSubscribersCount(): Promise<void> {
        if (!this.element || this.props.currentUserRole === 'guest') return;
        const el = this.element.querySelector('.channel-header__subscribers');
        if (!el) return;

        const count = this.props.chat.subscribersCount || 0;
        el.textContent = `${count} ${this.getSubscriberWord(count)}`;
    }

    private getSubscriberWord(count: number): string {
        const last = count % 10;
        const lastTwo = count % 100;
        if (lastTwo >= 11 && lastTwo <= 19) return 'подписчиков';
        if (last === 1) return 'подписчик';
        if (last >= 2 && last <= 4) return 'подписчика';
        return 'подписчиков';
    }

    private closeChatMenu(): void {
        this.deleteChatMenu?.unmount();
        this.deleteChatMenu = null;
        this.isDeleteMenuOpen = false;
    }

    private openDeleteConfirm(): void {
        if (this.isConfirmOpen) return;
        const slot = this.element?.querySelector('[data-component="channel-settings-slot"]');
        const name = this.props.chat.title.length > 20
            ? this.props.chat.title.substring(0, 20) + '…'
            : this.props.chat.title;

        this.confirmModal = new ConfirmModal({
            text: `Вы уверены, что хотите удалить канал "${name}"? Вся история сообщений будет удалена…`,
            confirmButtonText: 'Удалить',
            onCancel: () => this.closeConfirm(),
            onConfirm: () => {
                this.closeConfirm();
                this.props.onDeleteChat?.();
            },
        });
        this.confirmModal.mount(slot as HTMLElement);
        this.isConfirmOpen = true;
    }

    private openLeaveConfirm(): void {
        if (this.isConfirmOpen) return;
        const slot = this.element?.querySelector('[data-component="channel-settings-slot"]');

        this.confirmModal = new ConfirmModal({
            text: 'Вы точно хотите выйти из канала?',
            confirmButtonText: 'Выйти',
            onCancel: () => this.closeConfirm(),
            onConfirm: () => {
                this.closeConfirm();
                this.props.onLeaveChannel?.();
            },
        });
        this.confirmModal.mount(slot as HTMLElement);
        this.isConfirmOpen = true;
    }

    private closeConfirm(): void {
        this.confirmModal?.unmount();
        this.confirmModal = null;
        this.isConfirmOpen = false;
    }

    protected beforeUnmount(): void {
        this.avatarComponent?.unmount();
        this.searchButton?.unmount();
        this.settingsButton?.unmount();
        this.closeChatMenu();
        this.closeConfirm();
        wsClient.unsubscribe('chat.Updated.Avatar', this.handleAvatarUpdated);
        wsClient.unsubscribe('chat.Updated.Title', this.handleTitleUpdated);
        wsClient.unsubscribe('chat.Updated.Members', this.handleMembersUpdated);
    }
}
