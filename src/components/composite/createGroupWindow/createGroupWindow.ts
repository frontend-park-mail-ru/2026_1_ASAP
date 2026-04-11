import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createGroupWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import { Button } from "../../ui/button/button";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";
import { InfoMenu } from "../infoMenu/infoMenu";
import { FindUserContainer } from "../findUserContainer/findUserContainer";
import { contactService } from "../../../services/contactService";

interface CreateGroupWindowProps extends IBaseComponentProps {
    router: Router;
    onSubmit: (userIds: number[], contactNames: string) => void;
    onSubmitSearch: (login: string) => Promise<string | void> | void;
}

export class CreateGroupWindow extends BaseComponent<CreateGroupWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactList: ContactListWrapper | null = null;
    private submitButton: Button | null = null;
    private SearchField: SearchForm | null = null;
    private layoutContent: BaseComponent<any> | null = null;
    private selectedUsers: Map<number, string> = new Map(); 
    private infoMenu: InfoMenu | null = null;

    constructor(props: CreateGroupWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected async afterMount(): Promise<void> {
        super.afterMount();
        
        if (!this.element) return;
        
        const layoutSlot = this.element.querySelector('[data-component="layout-slot"]');
        const footerSlot = this.element.querySelector('[data-component="footer-slot"]');

        this.SearchField = new SearchForm({
            class: "create-group-window__search",
            hideAddButton: true,
            placeholder: "Поиск",
            onSearch: (query: string) => {
                console.log("Поиск контактов по запросу:", query); // todo: реализовать поиск контактов 
            }
        });

        this.actionHeader = new ActionHeader({
            backButton: new Button({
                label: "Назад",
                class: "create-group-window__back-button",
                onClick: () => this.props.router.navigate('/chats') 
            }),
            content: "Выберите пользователей"
        });

        const contacts = await contactService.getContacts();

        if (contacts.length === 0) {
            this.layoutContent = new FindUserContainer({
                showEmptyMessage: false,
                onSubmitSearch: (login: string) => {
                    return this.props.onSubmitSearch(login);
                },
                labelButton: "Добавить",
                labelInput: "Введите логин:",
                labelTitle: "У вас пока нет контактов, найдите кого-нибудь!"
            });

            this.actionLayout = new ActionLayout({
                header: this.actionHeader,
                content: [this.SearchField, this.layoutContent],
            });
            this.actionLayout.mount(layoutSlot as HTMLElement);
        } else {
            this.contactList = new ContactListWrapper({
                router: this.props.router,
                listMode: "createGroup",
                onAction: (contactId: number, isSelected?: boolean, contactName?: string) => {
                    if (isSelected && contactName) {
                        this.selectedUsers.set(contactId, contactName);
                    } else {
                        this.selectedUsers.delete(contactId);
                    }
                }
            });

            this.actionLayout = new ActionLayout({
                header: this.actionHeader,
                content: [this.SearchField, this.contactList],
            });
            this.actionLayout.mount(layoutSlot as HTMLElement);

            this.submitButton = new Button({
                label: "Создать группу",
                class: "ui-button ui-button__primary create-group-submit-btn",
                onClick: () => {
                    if (this.selectedUsers.size === 0) {
                        this.infoMenu = new InfoMenu({
                            message: "Выберите хотя бы одного пользователя для создания чата!",
                            onClose: () => {
                                this.infoMenu?.unmount();
                                this.infoMenu = null;
                            }
                        });
                        this.infoMenu.mount(document.body);
                        return;
                    }

                    const idsArray = Array.from(this.selectedUsers.keys());
                    // Склеиваем имена через запятую для названия группы
                    const groupName = Array.from(this.selectedUsers.values()).join(', ');
                    
                    this.props.onSubmit(idsArray, groupName);
                }
            });
            if (footerSlot) this.submitButton.mount(footerSlot as HTMLElement);
        }
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.actionLayout?.unmount();
        this.actionHeader?.unmount();
        this.contactList?.unmount();
        this.layoutContent?.unmount();
        this.submitButton?.unmount();
        this.infoMenu?.unmount();
        this.selectedUsers.clear();
    }
}