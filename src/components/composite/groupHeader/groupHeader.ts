import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { GroupChat, User } from '../../../types/chat';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import template from './groupHeader.hbs'
import { DeleteChatMenu } from '../deleteChatMenu/deleteChatMenu';
import { ConfirmModal } from '../confirmModal/confirmModal';
import { getFullUrl } from '../../../core/utils/url';
import { presenceService } from '../../../services/presenceService';
import { escapeHtml } from '../../../core/utils/escape';

interface GroupHeaderProps extends IBaseComponentProps {
    chat: GroupChat;
    currentUserRole: 'owner' | 'member';
    membersCount: number;
    /** ID текущего пользователя — нужен, чтобы исключить себя из «печатает» и «в сети». */
    currentUserId?: number;
    onDeleteChat?: () => void;
    onLeaveGroup?: () => void;
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
    private membersCount = 0;

    /** Presence-агрегаты по участникам: кто онлайн, кто печатает сейчас в этом чате. */
    private onlineIds = new Set<number>();
    private typingIds = new Set<number>();
    private presenceUnsubs: (() => void)[] = [];

    constructor(props: GroupHeaderProps) {
        super(props);
        this.tempName = 'components/composite/groupHeader/groupHeader';
        this.membersCount = props.membersCount;
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
                        const isOwner = this.props.currentUserRole === 'owner';
                        this.deleteChatMenu = new DeleteChatMenu({
                            typeChat: "group",
                            deleteLabel: isOwner ? "Удалить группу" : "Выйти из группы",
                            onInfo: () => {
                                this.openInfo();
                                this.deleteChatMenu?.unmount();
                                this.isDeleteMenuOpen = false;
                            },
                            onDelete: () => {
                                this.deleteChatMenu?.unmount();
                                this.deleteChatMenu = null;
                                this.isDeleteMenuOpen = false;
                                if (isOwner) {
                                    this.openDeleteMenu();
                                } else {
                                    this.props.onLeaveGroup?.();
                                }
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

        this.setMemberCount(this.membersCount);
        this.attachPresence();
    }

    /** Подписываемся на presence (online + typing) каждого участника группы. */
    private attachPresence(): void {
        const members = this.props.chat.members ?? [];
        const selfId = this.props.currentUserId;
        members.forEach((m: User) => {
            if (typeof m.id !== 'number' || m.id === selfId) return;

            // Прогреваем агрегат из кэша presenceService (если уже знаем состояние).
            const seed = presenceService.get(m.id);
            if (seed) this.applyPresenceFor(m.id, seed.isOnline ?? false, seed.typingInChat);

            const unsub = presenceService.subscribe(m.id, (state) => {
                this.applyPresenceFor(m.id, state.isOnline ?? false, state.typingInChat);
            });
            this.presenceUnsubs.push(unsub);
        });
        this.renderStatusLine();
    }

    private applyPresenceFor(userId: number, isOnline: boolean, typingInChat: number | string | undefined): void {
        if (isOnline) this.onlineIds.add(userId); else this.onlineIds.delete(userId);

        const myChatId = String(this.props.chat.id);
        const typesHere = typingInChat !== undefined && String(typingInChat) === myChatId;
        if (typesHere) this.typingIds.add(userId); else this.typingIds.delete(userId);

        this.renderStatusLine();
    }

    /** Рисует подпись «N участников, M в сети» или «печатает Имя ⋯» если кто-то набирает. */
    private renderStatusLine(): void {
        const el = this.element?.querySelector<HTMLElement>('.group-header__members');
        if (!el) return;

        // Кто-то печатает — приоритет над «в сети».
        if (this.typingIds.size > 0) {
            const name = this.getTypingDisplayName();
            el.classList.add('group-header__members--typing');
            el.innerHTML = `печатает ${escapeHtml(name)}<span class="group-header__typing-dots"><span></span><span></span><span></span></span>`;
            return;
        }

        el.classList.remove('group-header__members--typing');
        const onlineCount = this.onlineIds.size;
        const membersText = `${this.membersCount} ${this.getMemberWord(this.membersCount)}`;
        el.textContent = onlineCount > 0 ? `${membersText}, ${onlineCount} в сети` : membersText;
    }

    /** Имя для подписи «печатает …». Если печатает один — его имя, иначе количество. */
    private getTypingDisplayName(): string {
        const first = this.typingIds.values().next().value as number | undefined;
        if (this.typingIds.size > 1) return `${this.typingIds.size} участников`;
        if (first === undefined) return '';
        const user = (this.props.chat.members ?? []).find((m: User) => m.id === first);
        if (!user) return '...';
        const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.login || '...';
        return name;
    }

    public setAvatar(avatarUrl?: string | null): void {
        const avatarImg = this.element?.querySelector('.group-header__avatar') as HTMLImageElement | null;
        if (avatarImg) {
            avatarImg.src = avatarUrl
                ? getFullUrl(avatarUrl)
                : '/assets/images/avatars/defaultGroup.svg';
        }
        this.props.chat.avatarUrl = avatarUrl || undefined;
    }

    public setTitle(title: string): void {
        const nameEl = this.element?.querySelector('.group-header__name');
        if (nameEl) nameEl.textContent = title;
        this.props.chat.title = title;
    }

    public applyMembersDelta(type: 'added' | 'deleted', delta: number): void {
        this.setMemberCount(type === 'added'
            ? this.membersCount + delta
            : Math.max(0, this.membersCount - delta));
    }

    public setMemberCount(count: number): void {
        this.membersCount = count;
        // Делегируем рендеру статусной строки — он учитывает «в сети» и «печатает».
        this.renderStatusLine();
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
        this.presenceUnsubs.forEach((unsub) => unsub());
        this.presenceUnsubs = [];
        this.onlineIds.clear();
        this.typingIds.clear();
        this.avatarComponent?.unmount();
        this.searchButton?.unmount();
        this.settingsButton?.unmount();
        this.deleteChatMenu?.unmount();
        this.confirmModal?.unmount();
    }
}
