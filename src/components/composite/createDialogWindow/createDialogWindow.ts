import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createDialogWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import { Button } from "../../ui/button/button";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";
import { contactService } from "../../../services/contactService";
import { FindUserContainer } from "../findUserContainer/findUserContainer";

interface CreateDialogWindowProps extends IBaseComponentProps {
    router: Router;
    onSubmit: (contactId: number, contactName: string) => void;
    onSubmitSearch: (login: string) => void;
}

export class CreateDialogWindow extends BaseComponent<CreateDialogWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactList: ContactListWrapper | null = null;
    private SearchField: SearchForm | null = null;
    private layoutContent: BaseComponent<any> | null = null;

    constructor(props: CreateDialogWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected async afterMount(): Promise<void> {
        if (!this.element) {
            console.error("CreateDialogWindow: нет элемента для монтирования");
            return;
        }
        
        this.SearchField = new SearchForm({
            class: "create-dialog-window__search",
            hideAddButton: true,
            placeholder: "Поиск",
            onSearch: (query: string) => {
                console.log("Поиск контактов по запросу:", query); // todo: реализовать поиск контактов 
            }
        });


        this.actionHeader = new ActionHeader({
            backButton: new Button({
                class: "create-dialog-window__back-button",
                label: "Назад",
                onClick: () => {
                    this.props.router.navigate('/chats');
                }
            }),
            content: "Выберите пользователя"
        });
       
        const contacts = await contactService.getContacts();
        if (contacts.length === 0) {        
            this.layoutContent = new FindUserContainer({
                showEmptyMessage: true,
                onSubmitSearch: (login: string) => {
                    this.props.onSubmitSearch(login);
                }
            });
        } else {   
            this.layoutContent = new ContactListWrapper({
                router: this.props.router,
                listMode: 'createDialog',
                onAction: (contactId: number, isSelected?: boolean, contactName?: string) => {
                    this.props.onSubmit(contactId, contactName || "Новый диалог");
                }
            });
        }
1
        this.actionLayout = new ActionLayout({
            header: this.actionHeader,
            content: [this.SearchField, this.layoutContent],
        });

        this.actionLayout.mount(this.element);
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.actionLayout?.unmount();
        this.actionHeader?.unmount();
        this.contactList?.unmount();
    }
}