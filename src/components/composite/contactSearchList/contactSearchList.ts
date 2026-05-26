import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import { ChatListWrapper } from "../chatListWrapper/chatListWrapper";
import { SearchTabs, type SearchTab } from "../searchTabs/searchTabs";
import type { SearchContactsResult, UnifiedSearchResult } from "../../../types/search";
import type { FrontendContact } from "../../../types/contact";
import template from "./contactSearchList.hbs";

type SearchScope = 'contacts' | 'local';

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
    /** Используется при listMode != 'default' (создание диалога/группы). */
    onSearchContacts?: (query: string, scope: SearchScope) => Promise<SearchContactsResult | null>;
    /** Используется при listMode='default' (страница /contacts) — унифицированный поиск. */
    onSearchUnified?: (query: string, tab: SearchTab) => Promise<UnifiedSearchResult | null>;
    onAction?: (contactId: number, isSelected?: boolean, contactName?: string) => void;
    onContactsLoaded?: (contacts: FrontendContact[]) => void;
}

export class ContactSearchList extends BaseComponent<ContactSearchListProps> {
    private searchForm: SearchForm | null = null;
    private contactListWrapper: ContactListWrapper | null = null;
    /** Для рендера chat/contact результатов унифицированного поиска. */
    private chatListWrapper: ChatListWrapper | null = null;
    private searchTabs: SearchTabs | null = null;

    /** Используется только в createDialog/createGroup (legacy scope). */
    private legacyTabsEl: HTMLElement | null = null;
    private legacyScope: SearchScope = 'contacts';

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
        } else {
            // Legacy: scope-табы для createDialog/createGroup.
            this.legacyTabsEl = this.buildLegacyTabs();
            tabsSlot.appendChild(this.legacyTabsEl);
        }

        this.contactListWrapper = new ContactListWrapper({
            router: this.props.router,
            contacts: this.props.contacts,
            listMode: this.props.listMode,
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
        if (!result || !this.chatListWrapper) return;

        if (result.tab === 'contact') {
            this.chatListWrapper.showContactResults(
                result.contacts?.local ?? [],
                result.contacts?.global ?? [],
            );
        } else {
            this.chatListWrapper.showSearchResults(result.chats);
        }
    }

    /** Переключение visibility: список моих контактов vs результаты поиска. */
    private setSearchMode(active: boolean): void {
        if (!this.element) return;
        const listSlot = this.element.querySelector<HTMLElement>('.contact-search-list__list');
        const chatResultsSlot = this.element.querySelector<HTMLElement>('.contact-search-list__chat-results');
        // .contact-search-list__list имеет display: flex в SCSS — атрибут [hidden]
        // не переопределяет это из-за специфичности UA-стиля. Используем inline-стиль.
        if (listSlot) listSlot.style.display = active ? 'none' : '';
        if (chatResultsSlot) chatResultsSlot.style.display = active ? '' : 'none';
        this.searchTabs?.toggleVisible(active);
    }

    // ───────── Legacy scope-табы (для createDialog/createGroup) ─────────

    private buildLegacyTabs(): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'contacts-search-tabs';
        const isContactsActive = this.legacyScope === 'contacts' ? 'contacts-search-tabs__btn--active' : '';
        const isLocalActive = this.legacyScope === 'local' ? 'contacts-search-tabs__btn--active' : '';
        wrap.innerHTML = `
            <button type="button" class="contacts-search-tabs__btn ${isContactsActive}" data-scope="contacts">Контакты</button>
            <button type="button" class="contacts-search-tabs__btn ${isLocalActive}" data-scope="local">Глобальный поиск</button>
        `;
        if (this.props.listMode !== 'createDialog') {
            wrap.style.display = 'none';
        }
        wrap.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.contacts-search-tabs__btn');
            if (!btn) return;
            const scope = btn.dataset.scope as SearchScope;
            if (scope === this.legacyScope) return;
            this.legacyScope = scope;

            wrap.querySelectorAll('.contacts-search-tabs__btn').forEach((b) =>
                b.classList.toggle('contacts-search-tabs__btn--active', b === btn),
            );

            if (this.currentQuery.trim()) {
                void this.runLegacySearch(this.currentQuery);
            }
        });
        return wrap;
    }

    private async runLegacySearch(query: string): Promise<void> {
        if (!this.props.onSearchContacts) return;
        this.searchRequestId += 1;
        const myId = this.searchRequestId;
        const result = await this.props.onSearchContacts(query, this.legacyScope);
        if (myId !== this.searchRequestId) return;
        if (!result) return;
        this.contactListWrapper?.showSearchResults(result.items);
    }

    // ───────── Общая логика ─────────

    private handleSearchInput = (query: string): void => {
        if (this.searchDebounce !== null) clearTimeout(this.searchDebounce);
        this.currentQuery = query;

        if (!query.trim()) {
            this.searchRequestId += 1;
            if (this.isUnifiedMode()) {
                this.setSearchMode(false);
                this.contactListWrapper?.restoreContactList();
                // Reset таба на контакт, чтобы при следующем поиске начать с него.
                this.currentTab = 'contact';
                this.searchTabs?.setActiveTab('contact');
            } else {
                if (this.legacyTabsEl && this.props.listMode !== 'createDialog') {
                    this.legacyTabsEl.style.display = 'none';
                }
                this.contactListWrapper?.restoreContactList();
            }
            return;
        }

        if (this.isUnifiedMode()) {
            this.setSearchMode(true);
        } else if (this.legacyTabsEl) {
            this.legacyTabsEl.style.display = 'flex';
        }

        this.searchDebounce = setTimeout(() => {
            if (this.isUnifiedMode()) {
                void this.runUnifiedSearch(query);
            } else {
                void this.runLegacySearch(query);
            }
        }, 300);
    };

    /**
     * Переключает scope на «Глобальный поиск» (только для legacy createDialog).
     */
    public activateGlobalSearch(): void {
        if (this.isUnifiedMode()) {
            // В unified-режиме «глобальный поиск» — это контакт-таб с непустым
            // запросом: вкладка contact показывает local+global автоматически.
            this.searchForm?.focusInput();
            return;
        }
        this.legacyScope = 'local';
        if (this.legacyTabsEl) {
            this.legacyTabsEl.style.display = 'flex';
            this.legacyTabsEl.querySelectorAll('.contacts-search-tabs__btn').forEach((btn) => {
                const b = btn as HTMLElement;
                b.classList.toggle('contacts-search-tabs__btn--active', b.dataset.scope === 'local');
            });
        }
        this.searchForm?.focusInput();
        if (this.currentQuery.trim()) {
            void this.runLegacySearch(this.currentQuery);
        }
    }

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
        this.legacyTabsEl?.remove();
        this.legacyTabsEl = null;
        this.legacyScope = 'contacts';
        this.currentTab = 'contact';
        this.currentQuery = '';
    }
}
