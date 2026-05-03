import template from "./contacts.hbs"
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { authService } from "../../services/authService";
import { BasePage, IBasePageProps } from "../../core/base/basePage"
import { MenuBar } from "../../components/composite/menuBar/menuBar";
import { ContactListWrapper } from "../../components/composite/contactListWrapper/contactListWrapper";
import { ProfileWindow } from "../../components/composite/profileWindow/profileWindow";
import { contactService } from "../../services/contactService";
import { AddContactWindow } from "../../components/composite/addContactWindow/addContactWindow";
import { FrontendProfile } from "../../types/profile";


/**
 * @interface ContactsPageProps
 * @description Свойства для компонента страницы контактов.
 * @extends IBasePageProps
 * @property {string} [currentPath] - Текущий URL-путь для внутреннего роутинга.
 */
interface ContactsPageProps extends IBasePageProps {
    currentPath?: string;
};

/**
 * @class ContactsPage
 * @extends BasePage
 * @description Страница для управления контактами. Отображает список контактов,
 * позволяет просматривать профили, а также добавлять новые контакты.
 *
 * @property {SearchForm | null} searchForm - Форма поиска.
 * @property {ContactListWrapper | null} contactListWrapper - Обертка списка контактов.
 * @property {MenuBar | null} menuBar - Нижнее меню навигации.
 * @property {ProfileWindow | null} profileWindow - Окно с профилем выбранного контакта.
 * @property {AddContactWindow | null} addContactWindow - Окно добавления нового контакта.
 * @property {number | null} activeContactId - ID активного (выбранного) контакта.
 */
export class ContactsPage extends BasePage<ContactsPageProps> {
    private searchForm: SearchForm | null = null;
    private contactListWrapper: ContactListWrapper | null = null;
    private menuBar: MenuBar | null = null;
    private mainContentArea: HTMLElement | null = null;
    private profileWindow: ProfileWindow | null = null;
    private placeHolder: HTMLElement | null = null;
    private activeContactId: number | null = null;
    private addContactWindow: AddContactWindow | null = null;
    private currentUserId: number | null = null;
    private currentUserProfile: FrontendProfile | null = null;
    private searchDebounce: ReturnType<typeof setTimeout> | null = null;
    private searchScope: 'contacts' | 'local' = 'contacts';
    private searchTabsEl: HTMLElement | null = null;
    private currentQuery: string = '';
    private searchRequestId = 0;

    constructor(props: ContactsPageProps = {}) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    private buildSearchTabs(): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'contacts-search-tabs';
        wrap.innerHTML = `
            <button type="button" class="contacts-search-tabs__btn contacts-search-tabs__btn--active" data-scope="contacts">Контакты</button>
            <button type="button" class="contacts-search-tabs__btn" data-scope="local">Глобальный поиск</button>
        `;
        wrap.style.display = 'none';
        wrap.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.contacts-search-tabs__btn');
            if (!btn) return;
            const scope = btn.dataset.scope as 'contacts' | 'local';
            if (scope === this.searchScope) return;
            this.searchScope = scope;

            wrap.querySelectorAll('.contacts-search-tabs__btn').forEach(b => 
                b.classList.toggle('contacts-search-tabs__btn--active', b === btn)
            );

            if (this.currentQuery.trim()) {
                this.runContactSearch(this.currentQuery);
            }
        });
        return wrap;
    }

    /**
     * Обрабатывает внутренний роутинг на странице контактов.
     * Извлекает ID контакта из URL и открывает его профиль.
     * @private
     */
    private async handleContactsRoute(): Promise<void> {
        try {
            const path = this.props.currentPath || window.location.pathname;
            const pathParts = path.split('/');
            const lastParam = pathParts[pathParts.length - 1];
            if (lastParam == "add") {
                this.showAddContactWindow();
                return;
            }

            if (path == "/contacts" || !lastParam) {
                this.cleanupMainContent();
                this.activeContactId = null;
                this.contactListWrapper?.setActiveContact(null);
                if (this.placeHolder) {
                    this.placeHolder.style.display = "block";
                }
                return;
            }
            const login: string = String(lastParam).trim();
            if (login === "") return;

            const response = await contactService.getIdByLogin(login);
            if (response.status != 200) {
                this.cleanupMainContent();
                this.activeContactId = null;
                this.contactListWrapper?.setActiveContact(null);
                if (this.placeHolder) {
                    this.placeHolder.style.display = "block";
                }
                this.props.router?.navigate("/contacts");
                return;
            }

            const id = response.id;

            this.activeContactId = id;
            this.contactListWrapper?.setActiveContact(this.activeContactId);
            void this.openContact(this.activeContactId);
        } finally {
            this.syncMobileLayoutState();
        }
    }

    private handleSearchInput = (query: string): void => {
        if (this.searchDebounce !== null) clearTimeout(this.searchDebounce);
        this.currentQuery = query;

        if (!query.trim()) {
            this.searchRequestId += 1;
            if (this.searchTabsEl) this.searchTabsEl.style.display = 'none';
            this.contactListWrapper?.restoreContactList();
            return;
        }

        if (this.searchTabsEl) this.searchTabsEl.style.display = 'flex';
        this.searchDebounce = setTimeout(() => this.runContactSearch(query), 300);
    };

    private async runContactSearch(query: string): Promise<void> {
        this.searchRequestId += 1;
        const myId = this.searchRequestId;
        const result = await contactService.searchContacts(query, this.searchScope);
        if (myId !== this.searchRequestId) return;
        if (!result) return;
        this.contactListWrapper?.showSearchResults(result.items);
    }

    /**
     * Обновляет свойства компонента и перезапускает внутренний роутер.
     * @param {ContactsPageProps} newProps - Новые свойства.
     */
    public async updateProps(newProps: ContactsPageProps): Promise<void> {
        this.props = {...this.props, ...newProps};
        await this.handleContactsRoute();
    }


    /**
     * Очищает правую контентную область (окно профиля или добавления контакта).
     * @private
     */
    private cleanupMainContent(): void {
        if (this.placeHolder) {
            this.placeHolder.style.display = "none";
        }
        if (this.profileWindow) {
            this.profileWindow.unmount();
            this.profileWindow = null;
        }
        if (this.addContactWindow) {
            this.addContactWindow.unmount();
            this.addContactWindow = null;
        }
        this.syncMobileLayoutState();
    }

    /**
     * На узких экранах: либо список контактов, либо основная область (профиль / добавление).
     * Плавающая «‹» — пока нет шапки с кнопкой «назад» (загрузка профиля).
     */
    private syncMobileLayoutState(): void {
        const pageRoot = this.element?.classList.contains("contacts-page")
            ? this.element
            : this.element?.querySelector(".contacts-page");
        if (!pageRoot) return;

        const mainVisible =
            this.activeContactId !== null ||
            this.addContactWindow !== null ||
            this.profileWindow !== null;

        const addOrProfileHasBack =
            this.addContactWindow !== null || this.profileWindow !== null;
        const mobileFloatingBackVisible = mainVisible && !addOrProfileHasBack;

        pageRoot.classList.toggle("contacts-page--main-visible", mainVisible);
        pageRoot.classList.toggle("contacts-page--mobile-floating-back", mobileFloatingBackVisible);
    }

    private readonly handleMobileBack = (): void => {
        if (this.activeContactId !== null || this.addContactWindow !== null || this.profileWindow !== null) {
            this.props.router?.navigate("/contacts");
        }
    };

    /**
     * Выполняется после монтирования страницы.
     * Инициализирует все компоненты (поиск, список контактов, меню)
     * и запускает обработку текущего URL.
     * @protected
     */
    async afterMount() {
        if (!this.element) {
            return;
        }

        const sidebar = this.element.querySelector('.contacts-page__sidebar')!;

        this.searchForm = new SearchForm({
            router: this.props.router,
            onAddClick: () => this.props.router.navigate('/contacts/add'),
            onSearch: this.handleSearchInput,
        });
        this.searchForm.mount(sidebar as HTMLElement);

        this.searchTabsEl = this.buildSearchTabs();
        sidebar.appendChild(this.searchTabsEl);

        this.contactListWrapper = new ContactListWrapper({
            router: this.props.router,
        });
        this.contactListWrapper.mount(sidebar as HTMLElement);

        this.menuBar = new MenuBar({
            onSettingsClick: () => this.props.router.navigate('/settings'),
            onContactsClick: () => this.props.router.navigate('/contacts'),
            onMessagesClick: () => this.props.router.navigate('/chats'),
        });
        this.menuBar.mount(sidebar as HTMLElement);
        this.menuBar.setActiveButton('contacts');

        this.mainContentArea = this.element.querySelector('.contacts-page__mainfield') || null;
        if (!this.mainContentArea) {
            console.error("Отсутствует элемент contacts-page__mainfield");
            return;
        }

        this.placeHolder = this.element.querySelector('.empty-field');
        if (!this.activeContactId && this.placeHolder) {
            this.placeHolder.style.display = 'block';
        }

        try {
            this.currentUserProfile = await contactService.getMyProfile();
            this.currentUserId = this.currentUserProfile.additionalInfo.id;
        } catch (error) {
            console.error("ContactsPage: Не удалось получить профиль пользователя", error);
        }

        window.addEventListener("keyup", this.handleKeyUp);

        const mobileBack = this.element.querySelector(".contacts-page__mobile-back");
        mobileBack?.addEventListener("click", this.handleMobileBack);

        await this.handleContactsRoute();
    };

    /**
     * Открывает окно с профилем пользователя.
     * @param {number | null} activeId - ID пользователя для отображения.
     * @private
     */
    private async openContact(activeId: number | null): Promise<void> {
        if (!this.mainContentArea) {
            console.error("Отсутствует элемент mainContentArea");
            return;
        }

        if (this.placeHolder) {
            this.placeHolder.style.display = "none";
        }

        if (this.profileWindow) {
            this.profileWindow.unmount();
            this.profileWindow = null;
        }

        const profileInfo = await contactService.getProfileInfo(this.activeContactId);

        if (this.activeContactId !== activeId) {
            this.syncMobileLayoutState();
            return;
        }
        this.cleanupMainContent();

        this.profileWindow = new ProfileWindow({
            profileMainInfo: profileInfo.mainInfo,
            profileAdditionalInfo: profileInfo.additionalInfo,
            closeWindow: this.closeContact,
            router: this.props.router,
            onContactsChanged: () => this.contactListWrapper?.reload(),
        });

        this.profileWindow.mount(this.mainContentArea);
        this.syncMobileLayoutState();
    };

    /**
     * Закрывает окно профиля и возвращает на предыдущую страницу через историю браузера.
     * @private
     */
    private closeContact = (): void => {
        window.history.back();
    };

    /**
     * Обработчик нажатия клавиш. Закрывает открытый контакт по нажатию Escape.
     * @param {KeyboardEvent} event - Событие клавиатуры.
     * @private
     */
    private handleKeyUp = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            if (this.activeContactId || this.addContactWindow) {
                this.closeContact();
            }
        }
    };

    /**
     * Отображает окно для добавления нового контакта.
     * @private
     */
    private showAddContactWindow(): void {
        if (!this.mainContentArea) return;

        this.activeContactId = null;
        this.contactListWrapper?.setActiveContact(null); 
        this.cleanupMainContent();

        this.addContactWindow = new AddContactWindow({
            onBack: () => {
                this.props.router.navigate('/contacts');
            },
            onSubmitSearch: async (login: string) => {
                const targetLogin = login.trim().toLowerCase();
                if (this.currentUserProfile && this.currentUserProfile.additionalInfo.login.toLowerCase() === targetLogin) {
                    return "Вы не можете добавить самого себя в контакты";
                }

                const targetRes = await contactService.getIdByLogin(login);
                if (targetRes.status === 404 || !targetRes.id) {
                    return `Пользователь с логином "${login}" не найден!`;
                }
                const successRes = await contactService.addContact(login, targetRes.id);
                
                if (successRes.success) {
                    this.closeAddContactWindow();
                    
                    const sidebar = this.element!.querySelector('.contacts-page__sidebar');
                    if (!sidebar) return;

                    this.searchForm?.unmount();
                    this.contactListWrapper?.unmount();
                    this.menuBar?.unmount();
                    sidebar.innerHTML = '';

                    this.searchForm = new SearchForm({ 
                        router: this.props.router,
                        onAddClick: () => this.props.router.navigate('/contacts/add'),
                        onSearch: this.handleSearchInput,
                    });
                    this.searchForm.mount(sidebar as HTMLElement);

                    this.searchTabsEl = this.buildSearchTabs();
                    sidebar.appendChild(this.searchTabsEl);

                    this.contactListWrapper = new ContactListWrapper({ router: this.props.router });
                    this.contactListWrapper.mount(sidebar as HTMLElement);

                    this.menuBar = new MenuBar({
                        onSettingsClick: () => this.props.router.navigate('/settings'),
                        onContactsClick: () => this.props.router.navigate('/contacts'),
                        onMessagesClick: () => this.props.router.navigate('/chats'),
                    });
                    this.menuBar.mount(sidebar as HTMLElement);
                    this.menuBar.setActiveButton('contacts');
                    
                    this.props.router.navigate(`/contacts/${login}`);
                    return undefined;
                } else if (successRes.code === 'CANT_CREATE_CONTACT_WITH_YOURSELF') {
                    return "Вы не можете добавить самого себя в контакты";
                } else if (successRes.status === 409) {
                    return `Пользователь "${login}" уже в контактах!`;
                } else {
                    return `Ошибка сервера: ${successRes.status}`;
                }
            }
        });
        this.addContactWindow.mount(this.mainContentArea);
        this.syncMobileLayoutState();
    }

    /**
     * Закрывает окно добавления контакта и возвращает плейсхолдер.
     * @private
     */
    private closeAddContactWindow(): void {
        if (!this.addContactWindow) return;
        
        this.addContactWindow.unmount();
        this.addContactWindow = null;
        
        if (this.placeHolder) {
            this.placeHolder.style.display = 'block';
        }
        
        this.activeContactId = null;
        this.contactListWrapper?.setActiveContact(null);
        this.syncMobileLayoutState();
    }

    beforeUnmount() {
        this.element?.querySelector(".contacts-page__mobile-back")?.removeEventListener("click", this.handleMobileBack);
        this.searchForm?.unmount();
        this.menuBar?.unmount();
        this.contactListWrapper?.unmount();
        window.removeEventListener("keyup", this.handleKeyUp);
        this.activeContactId = null;
        this.profileWindow?.unmount();
        this.profileWindow = null;
        this.addContactWindow?.unmount();
        this.addContactWindow = null;
        if (this.searchDebounce !== null) {
            clearTimeout(this.searchDebounce);
            this.searchDebounce = null;
        }
        this.searchRequestId += 1;
        this.searchTabsEl = null;
        this.searchScope = 'contacts';
    };
};