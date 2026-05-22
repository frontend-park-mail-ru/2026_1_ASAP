import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import type { SearchContactsResult } from "../../../types/search";
import type { FrontendContact } from "../../../types/contact";
import template from "./contactSearchList.hbs";

type SearchScope = 'contacts' | 'local';

/**
 * @interface ContactSearchListProps
 * @description Композитный блок: поиск + табы scope + список контактов.
 * @property {Router} router
 * @property {'default' | 'createDialog' | 'createGroup'} [listMode='default'] - режим ContactListWrapper.
 * @property {boolean} [hideAddButton=false] - скрыть кнопку «+» в SearchForm (FAB меню).
 * @property {() => void} [onAddClick] - кастомный обработчик клика по «+» (вместо FAB).
 * @property {(id, isSelected?, name?) => void} [onAction] - проброс в ContactListWrapper.
 */
interface ContactSearchListProps extends IBaseComponentProps {
    router: Router;
    contacts?: FrontendContact[];
    listMode?: 'default' | 'createDialog' | 'createGroup';
    hideAddButton?: boolean;
    onAddClick?: () => void;
    onSearchContacts: (query: string, scope: SearchScope) => Promise<SearchContactsResult | null>;
    onAction?: (contactId: number, isSelected?: boolean, contactName?: string) => void;
}

/**
 * @class ContactSearchList
 * @extends BaseComponent
 * @description Переиспользуемый блок: SearchForm + табы «Контакты / Глобальный поиск» + ContactListWrapper.
 * Инкапсулирует поисковую логику (debounce, scope, защита от устаревших ответов).
 */
export class ContactSearchList extends BaseComponent<ContactSearchListProps> {
    private searchForm: SearchForm | null = null;
    private contactListWrapper: ContactListWrapper | null = null;
    private tabsEl: HTMLElement | null = null;

    private searchScope: SearchScope = 'contacts';
    private currentQuery: string = '';
    private searchDebounce: ReturnType<typeof setTimeout> | null = null;
    private searchRequestId = 0;

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
        if (!searchSlot || !tabsSlot || !listSlot) return;

        this.searchForm = new SearchForm({
            router: this.props.router,
            hideAddButton: this.props.hideAddButton ?? false,
            onAddClick: this.props.onAddClick,
            onSearch: this.handleSearchInput,
        });
        this.searchForm.mount(searchSlot);

        this.tabsEl = this.buildSearchTabs();
        tabsSlot.appendChild(this.tabsEl);

        this.contactListWrapper = new ContactListWrapper({
            router: this.props.router,
            contacts: this.props.contacts,
            listMode: this.props.listMode,
            onAction: this.props.onAction,
        });
        this.contactListWrapper.mount(listSlot);
    }

    private buildSearchTabs(): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'contacts-search-tabs';
        wrap.innerHTML = `
            <button type="button" class="contacts-search-tabs__btn contacts-search-tabs__btn--active" data-scope="contacts">Контакты</button>
            <button type="button" class="contacts-search-tabs__btn" data-scope="local">Глобальный поиск</button>
        `;
        if (this.props.listMode !== 'createDialog') {
            wrap.style.display = 'none';
        }
        wrap.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.contacts-search-tabs__btn');
            if (!btn) return;
            const scope = btn.dataset.scope as SearchScope;
            if (scope === this.searchScope) return;
            this.searchScope = scope;

            wrap.querySelectorAll('.contacts-search-tabs__btn').forEach(b =>
                b.classList.toggle('contacts-search-tabs__btn--active', b === btn)
            );

            if (this.currentQuery.trim()) {
                void this.runSearch(this.currentQuery);
            }
        });
        return wrap;
    }

    private handleSearchInput = (query: string): void => {
        if (this.searchDebounce !== null) clearTimeout(this.searchDebounce);
        this.currentQuery = query;

        if (!query.trim()) {
            this.searchRequestId += 1;
            if (this.tabsEl && this.props.listMode !== 'createDialog') {
                this.tabsEl.style.display = 'none';
            }
            this.contactListWrapper?.restoreContactList();
            return;
        }

        if (this.tabsEl) this.tabsEl.style.display = 'flex';
        this.searchDebounce = setTimeout(() => this.runSearch(query), 300);
    };

    private async runSearch(query: string): Promise<void> {
        this.searchRequestId += 1;
        const myId = this.searchRequestId;
        const result = await this.props.onSearchContacts(query, this.searchScope);
        if (myId !== this.searchRequestId) return;
        if (!result) return;
        this.contactListWrapper?.showSearchResults(result.items);
    }

    /**
     * Переключает scope на «Глобальный поиск», показывает табы, фокусит инпут
     * и при наличии запроса — перезапускает поиск.
     */
    public activateGlobalSearch(): void {
        this.searchScope = 'local';
        if (this.tabsEl) {
            this.tabsEl.style.display = 'flex';
            this.tabsEl.querySelectorAll('.contacts-search-tabs__btn').forEach(btn => {
                const b = btn as HTMLElement;
                b.classList.toggle('contacts-search-tabs__btn--active', b.dataset.scope === 'local');
            });
        }
        this.searchForm?.focusInput();
        if (this.currentQuery.trim()) {
            void this.runSearch(this.currentQuery);
        }
    }

    public setActiveContact(contactId: number | null): void {
        this.contactListWrapper?.setActiveContact(contactId);
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
        this.tabsEl?.remove();
        this.tabsEl = null;
        this.searchScope = 'contacts';
        this.currentQuery = '';
    }
}
