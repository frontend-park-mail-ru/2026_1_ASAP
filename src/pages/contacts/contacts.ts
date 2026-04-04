import template from "./contacts.hbs"
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { authService } from "../../services/authService";
import { BasePage, IBasePageProps } from "../../core/base/basePage"
import { MenuBar } from "../../components/composite/menuBar/menuBar";
import { ContactListWrapper } from "../../components/composite/contactListWrapper/contactListWrapper";
import { ProfileWindow } from "../../components/composite/profileWindow/profileWindow";
import { contactService } from "../../services/contactService";

interface ContactsPageProps extends IBasePageProps {
    currentPath?: string;
};

export class ContactsPage extends BasePage<ContactsPageProps> {
    private searchForm: SearchForm | null = null;
    private contactListWrapper: ContactListWrapper | null = null;
    private menuBar: MenuBar | null = null;
    private mainContentArea: HTMLElement | null = null;
    private profileWindow: ProfileWindow | null = null;
    private placeHolder: HTMLElement | null = null;
    private activeContactId: number | null = null;

    constructor(props: ContactsPageProps = {}) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    private async handleContactsRoute(): Promise<void> {
        const path = this.props.currentPath || window.location.pathname;
        const pathParts = path.split('/');
        const id = pathParts[pathParts.length - 1];
        this.activeContactId = Number(id);
        if (isNaN(this.activeContactId)) return;

        this.contactListWrapper?.setActiveContact(this.activeContactId);
        this.openContact(this.activeContactId);
    };

    public async updateProps(newProps: ContactsPageProps): Promise<void> {
        this.props = {...this.props, ...newProps};
        await this.handleContactsRoute();
    }

    async afterMount() {
        // const isAuth = await authService.checkAuth();
        // if (!isAuth) {
        //     this.props.router.navigate('/login');
        //     return;
        // }
        if (!this.element) {
            return;
        }

        this.searchForm = new SearchForm({ router: this.props.router });
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

        this.profileWindow = new ProfileWindow({
            profileMainInfo: profileInfo.mainInfo,
            profileAdditionalInfo: profileInfo.additionalInfo,
            closeWindow: this.closeContact
        });

        this.profileWindow.mount(this.mainContentArea);
    };

    private closeContact = (): void => {
        if (!this.profileWindow) return;
        this.profileWindow!.unmount();
        if (this.placeHolder)
            this.placeHolder.style.display = "block";
        this.activeContactId = null;
        this.contactListWrapper?.setActiveContact(this.activeContactId);
    };

    beforeUnmount() {
        this.searchForm?.unmount();
        this.menuBar?.unmount();
        this.contactListWrapper?.unmount();
        this.activeContactId = null;
        this.profileWindow?.unmount();
        this.profileWindow = null;
    };
};