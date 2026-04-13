import template from "./contacts.hbs"
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { authService } from "../../services/authService";
import { BasePage, IBasePageProps } from "../../core/base/basePage"
import { MenuBar } from "../../components/composite/menuBar/menuBar";
import { ContactListWrapper } from "../../components/composite/contactListWrapper/contactListWrapper";
import { ProfileWindow } from "../../components/composite/profileWindow/profileWindow";
import { contactService } from "../../services/contactService";
import { AddContactWindow } from "../../components/composite/addContactWindow/addContactWindow";


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
        const path = this.props.currentPath || window.location.pathname;
        const pathParts = path.split('/');
        const lastParam = pathParts[pathParts.length - 1];
        if (lastParam == 'add') {
            this.showAddContactWindow();
            return;
        }

        if (path == '/contacts' || !lastParam) {
            this.cleanupMainContent();
            this.activeContactId = null;
            this.contactListWrapper?.setActiveContact(null);
            if (this.placeHolder) {
                this.placeHolder.style.display = 'block';
            }
            return;
        }
        const id: number = Number(lastParam);
        if (isNaN(id)) return;

        this.activeContactId = id;
        this.contactListWrapper?.setActiveContact(this.activeContactId);
        this.openContact(this.activeContactId);
    };

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
    }

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

        this.searchForm = new SearchForm({ 
            router: this.props.router,
            onAddClick: () => this.props.router.navigate('/contacts/add')
        });
        this.searchForm.mount(this.element.querySelector('.contacts-page__sidebar')!);

        this.contactListWrapper = new ContactListWrapper({
            router: this.props.router,
        });
        this.contactListWrapper.mount(this.element.querySelector('.contacts-page__sidebar')!);

        this.menuBar = new MenuBar({
            onSettingsClick: () => this.props.router.navigate('/settings'),
            onContactsClick: () => this.props.router.navigate('/contacts'),
            onMessagesClick: () => this.props.router.navigate('/chats'),
        });
        this.menuBar.mount(this.element.querySelector('.contacts-page__sidebar')!);
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

        if (this.activeContactId !== activeId) return;
        this.cleanupMainContent();

        this.profileWindow = new ProfileWindow({
            profileMainInfo: profileInfo.mainInfo,
            profileAdditionalInfo: profileInfo.additionalInfo,
            closeWindow: this.closeContact
        });

        this.profileWindow.mount(this.mainContentArea);
    };

    /**
     * Закрывает окно профиля и возвращает на предыдущую страницу через историю браузера.
     * @private
     */
    private closeContact = (): void => {
        window.history.back();
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
                        onAddClick: () => this.props.router.navigate('/contacts/add')
                    });
                    this.searchForm.mount(sidebar as HTMLElement);

                    this.contactListWrapper = new ContactListWrapper({ router: this.props.router });
                    this.contactListWrapper.mount(sidebar as HTMLElement);

                    this.menuBar = new MenuBar({
                        onSettingsClick: () => this.props.router.navigate('/settings'),
                        onContactsClick: () => this.props.router.navigate('/contacts'),
                        onMessagesClick: () => this.props.router.navigate('/chats'),
                    });
                    this.menuBar.mount(sidebar as HTMLElement);
                    this.menuBar.setActiveButton('contacts');
                    
                    this.props.router.navigate(`/contacts/${targetRes.id}`);
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
    }

    beforeUnmount() {
        this.searchForm?.unmount();
        this.menuBar?.unmount();
        this.contactListWrapper?.unmount();
        this.activeContactId = null;
        this.profileWindow?.unmount();
        this.profileWindow = null;
        this.addContactWindow?.unmount();
        this.addContactWindow = null;
    };
};