import template from "./contacts.hbs"
import { BasePage, IBasePageProps } from "../../core/base/basePage"
import { MenuBar } from "../../components/composite/menuBar/menuBar";
import { ContactSearchList } from "../../components/composite/contactSearchList/contactSearchList";
import { ContactSkeleton } from "../../components/composite/contactSkeleton/contactSkeleton";
import { ProfileWindow } from "../../components/composite/profileWindow/profileWindow";
import { contactService } from "../../services/contactService";
import { chatsUseCases } from "../chats/model/chatsUseCases";
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
 */
export class ContactsPage extends BasePage<ContactsPageProps> {
    private contactSearchList: ContactSearchList | null = null;
    private menuBar: MenuBar | null = null;
    private mainContentArea: HTMLElement | null = null;
    private profileWindow: ProfileWindow | null = null;
    private contactSkeleton: ContactSkeleton | null = null;
    private placeHolder: HTMLElement | null = null;
    private activeContactId: number | null = null;
    private currentUserId: number | null = null;
    private currentUserProfile: FrontendProfile | null = null;

    constructor(props: ContactsPageProps = {}) {
        super(props);
    };

    getTemplate() {
        return template;
    };

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
            if (path == "/contacts" || !lastParam) {
                this.cleanupMainContent();
                this.activeContactId = null;
                this.contactSearchList?.setActiveContact(null);
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
                this.contactSearchList?.setActiveContact(null);
                if (this.placeHolder) {
                    this.placeHolder.style.display = "block";
                }
                this.props.router?.navigate("/contacts");
                return;
            }

            const id = response.id;

            this.activeContactId = id;
            this.contactSearchList?.setActiveContact(this.activeContactId);
            void this.openContact(this.activeContactId);
        } finally {
            this.syncMobileLayoutState();
        }
    }

    /**
     * Обновляет свойства компонента и перезапускает внутренний роутер.
     * @param {ContactsPageProps} newProps - Новые свойства.
     */
    public async updateProps(newProps: ContactsPageProps): Promise<void> {
        this.props = {...this.props, ...newProps};
        await this.handleContactsRoute();
    }

    private cleanupMainContent(): void {
        if (this.placeHolder) {
            this.placeHolder.style.display = "none";
        }
        if (this.profileWindow) {
            this.profileWindow.unmount();
            this.profileWindow = null;
        }
        if (this.contactSkeleton) {
            this.contactSkeleton.unmount();
            this.contactSkeleton = null;
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
            this.profileWindow !== null;

        const mobileFloatingBackVisible = mainVisible && this.profileWindow === null;

        pageRoot.classList.toggle("contacts-page--main-visible", mainVisible);
        pageRoot.classList.toggle("contacts-page--mobile-floating-back", mobileFloatingBackVisible);
    }

    private readonly handleMobileBack = (): void => {
        if (this.activeContactId !== null || this.profileWindow !== null) {
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

        this.contactSearchList = new ContactSearchList({
            router: this.props.router,
            listMode: 'default',
            hideAddButton: false,
            onAddClick: () => this.contactSearchList?.activateGlobalSearch(),
            // Унифицированный поиск (4 таба) — тот же, что используется на /chats.
            onSearchUnified: (query, tab) => chatsUseCases.searchUnified(query, tab),
        });
        this.contactSearchList.mount(sidebar as HTMLElement);

        if (sessionStorage.getItem('contacts_activate_global_search')) {
            sessionStorage.removeItem('contacts_activate_global_search');
            this.contactSearchList.activateGlobalSearch();
        }

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
     * Показывает скелетон-плейсхолдер на месте ProfileWindow, пока идёт REST.
     * Геометрически совпадает с реальным окном, чтобы при подмене не было прыжка.
     */
    private mountContactSkeleton(): void {
        if (!this.mainContentArea) return;
        if (this.contactSkeleton) {
            this.contactSkeleton.unmount();
            this.contactSkeleton = null;
        }
        this.contactSkeleton = new ContactSkeleton({});
        this.contactSkeleton.mount(this.mainContentArea);
    }

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

        this.mountContactSkeleton();

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
            onContactsChanged: () => this.contactSearchList?.reload(),
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
            if (this.activeContactId) {
                this.closeContact();
            }
        }
    };

    beforeUnmount() {
        this.element?.querySelector(".contacts-page__mobile-back")?.removeEventListener("click", this.handleMobileBack);
        this.contactSearchList?.unmount();
        this.contactSearchList = null;
        this.menuBar?.unmount();
        window.removeEventListener("keyup", this.handleKeyUp);
        this.activeContactId = null;
        this.profileWindow?.unmount();
        this.profileWindow = null;
        this.contactSkeleton?.unmount();
        this.contactSkeleton = null;
    };
};
