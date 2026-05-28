import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import { ChatListWrapper } from "../chatListWrapper/chatListWrapper";
import { SearchTabs, type SearchTab } from "../searchTabs/searchTabs";
import type { UnifiedSearchResult } from "../../../types/search";
import type { FrontendContact } from "../../../types/contact";
import template from "./contactSearchList.hbs";

/**
 * @interface ContactSearchListProps
 * @description Композитный блок для страницы /contacts и режимов
 * createDialog/createGroup. По умолчанию (`listMode='default'`) использует
 * унифицированные табы поиска (Чаты/Группы/Каналы/Контакты), как на /chats.
 * Для createDialog/createGroup сохраняется старый scope-флоу (Контакты/Глобальный).
 */
interface ContactSearchListProps extends IBaseComponentProps {
    router: Router;
    contacts?: FrontendContact[];
    listMode?: 'default' | 'createDialog' | 'createGroup';
    hideAddButton?: boolean;
    onAddClick?: () => void;
    /** Используется при listMode='default' (страница /contacts) — унифицированный поиск. */
    onSearchUnified?: (query: string, tab: SearchTab) => Promise<UnifiedSearchResult | null>;
    selectedContactIds?: { has(contactId: number): boolean };
    onAction?: (contactId: number, isSelected?: boolean, contactName?: string) => void;
    onContactsLoaded?: (contacts: FrontendContact[]) => void;
}

export class ContactSearchList extends BaseComponent<ContactSearchListProps> {
    private searchForm: SearchForm | null = null;
    private contactListWrapper: ContactListWrapper | null = null;
    /** Для рендера chat/contact результатов унифицированного поиска. */
    private chatListWrapper: ChatListWrapper | null = null;
    private searchTabs: SearchTabs | null = null;

    private currentTab: SearchTab = 'contact';
    private currentQuery: string = '';
    private searchDebounce: ReturnType<typeof setTimeout> | null = null;
    private searchRequestId = 0;

    private isUnifiedMode(): boolean {
        return (this.props.listMode ?? 'default') === 'default';
    }

    constructor(props: ContactSearchListProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const searchSlot = this.element.querySelector<HTMLElement>('.contact-search-list__search');
        const tabsSlot = this.element.querySelector<HTMLElement>('.contact-search-list__tabs');
        const listSlot = this.element.querySelector<HTMLElement>('.contact-search-list__list');
        const chatResultsSlot = this.element.querySelector<HTMLElement>('.contact-search-list__chat-results');
        if (!searchSlot || !tabsSlot || !listSlot || !chatResultsSlot) return;

        this.searchForm = new SearchForm({
            router: this.props.router,
            hideAddButton: this.props.hideAddButton ?? false,
            onAddClick: this.props.onAddClick,
            onSearch: this.handleSearchInput,
        });
        this.searchForm.mount(searchSlot);

        if (this.isUnifiedMode()) {
            // Унифицированные табы: Чаты / Группы / Каналы / Контакты.
            this.searchTabs = new SearchTabs({
                activeTab: 'contact',
                onChange: (tab) => {
                    this.currentTab = tab;
                    this.setSearchMode(this.currentQuery.trim() !== '');
                    if (this.currentQuery.trim()) {
                        void this.runUnifiedSearch(this.currentQuery);
                    }
                },
            });
            this.searchTabs.mount(tabsSlot);
            this.searchTabs.toggleVisible(false);

            // chatListWrapper будем использовать для отрисовки результатов
            // унифицированного поиска (как chat-items, так и contact-items).
            this.chatListWrapper = new ChatListWrapper({
                chats: [],
                activeChatId: null,
                onOpenChat: (chatId) => this.props.router.navigate(`/chats/${chatId}`),
                onOpenContact: (login) => this.props.router.navigate(`/contacts/${login}`),
            });
            this.chatListWrapper.mount(chatResultsSlot);
        }

        this.contactListWrapper = new ContactListWrapper({
            router: this.props.router,
            contacts: this.props.contacts,
            listMode: this.props.listMode,
            selectedContactIds: this.props.selectedContactIds,
            onAction: this.props.onAction,
            onContactsLoaded: this.props.onContactsLoaded,
        });
        this.contactListWrapper.mount(listSlot);
    }

    // ───────── Унифицированный поиск (listMode='default') ─────────

    private async runUnifiedSearch(query: string): Promise<void> {
        if (!this.props.onSearchUnified) return;

        this.searchRequestId += 1;
        const myId = this.searchRequestId;
        const result = await this.props.onSearchUnified(query, this.currentTab);
        if (myId !== this.searchRequestId) return;
        if (!result) return;

        if (result.tab === 'contact') {
            this.contactListWrapper?.showContactResults(
                result.contacts?.local ?? [],
                result.contacts?.global ?? [],
            );
        } else {
            this.chatListWrapper?.showSearchResults(result.chats);
        }
    }

    private setSearchMode(active: boolean): void {
        if (!this.element) return;
        const listSlot = this.element.querySelector<HTMLElement>('.contact-search-list__list');
        const chatResultsSlot = this.element.querySelector<HTMLElement>('.contact-search-list__chat-results');
        
        if (this.isUnifiedMode()) {
            const isChatMode = active && this.currentTab !== 'contact';
            if (listSlot) listSlot.style.display = isChatMode ? 'none' : '';
            if (chatResultsSlot) chatResultsSlot.style.display = isChatMode ? '' : 'none';
        } else {
            if (listSlot) listSlot.style.display = '';
            if (chatResultsSlot) chatResultsSlot.style.display = 'none';
        }
        this.searchTabs?.toggleVisible(active);
    }

    // ───────── Общая логика ─────────

    private handleSearchInput = (query: string): void => {
        if (this.searchDebounce !== null) clearTimeout(this.searchDebounce);
        this.currentQuery = query;

        if (!query.trim()) {
            this.searchRequestId += 1;
            this.setSearchMode(false);
            this.contactListWrapper?.restoreContactList();
            this.currentTab = 'contact';
            this.searchTabs?.setActiveTab('contact');
            return;
        }

        this.setSearchMode(true);

        this.searchDebounce = setTimeout(() => {
            void this.runUnifiedSearch(query);
        }, 300);
    };

    public setActiveContact(contactId: number | null): void {
        this.contactListWrapper?.setActiveContact(contactId);
    }

    public setSearchQuery(query: string): void {
        this.searchForm?.setQuery(query);
        this.handleSearchInput(query);
    }

    public reload(): void {
        this.contactListWrapper?.reload();
    }

    protected beforeUnmount(): void {
        if (this.searchDebounce !== null) {
            clearTimeout(this.searchDebounce);
            this.searchDebounce = null;
        }
        this.searchRequestId += 1;
        this.searchForm?.unmount();
        this.contactListWrapper?.unmount();
        this.chatListWrapper?.unmount();
        this.searchTabs?.unmount();
        this.currentTab = 'contact';
        this.currentQuery = '';
    }
}
