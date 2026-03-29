import template from "./contacts.hbs"
import { SearchForm } from "../../components/composite/searchForm/searchForm";
import { authService } from "../../services/authService";
import { BasePage, IBasePageProps } from "../../core/base/basePage"
import { MenuBar } from "../../components/composite/menuBar/menuBar";

interface ContactsPageProps extends IBasePageProps {
    currentPath?: string;
};

export class ContactsPage extends BasePage<ContactsPageProps> {
    private searchForm: SearchForm | null = null;
    // private contactsListWrapper: ContactsListWrapper | null = null;
    private menuBar: MenuBar | null = null;

    constructor(props: ContactsPageProps = {}) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    async afterMount() {
        // const isAuth = await authService.checkAuth();
        // if (!isAuth) {
        //     this.props.router.navigate('/login');
        //     return;
        // }
        if (!this.element) {
            return;
        }

        this.searchForm = new SearchForm();
        this.searchForm.mount(this.element.querySelector('.contacts-page__sidebar')!);
        // this.contactsListWrapper = new contactsListWrapper();
        // this.contactsListWrapper.mount(this.element.querySelector('contacts-page__sidebar'));
        this.menuBar = new MenuBar({
            onSettingsClick: () => this.props.router.navigate('/settings'),
            onContactsClick: () => this.props.router.navigate('/contacts'),
            onMessagesClick: () => this.props.router.navigate('/chats'),
    });
        this.menuBar.mount(this.element.querySelector('.contacts-page__sidebar')!);
        this.menuBar.setActiveButton('contacts');
    };

    // openContact() {};

    beforeUnmount() {
        this.searchForm?.unmount();
        this.menuBar?.unmount();
    };
};