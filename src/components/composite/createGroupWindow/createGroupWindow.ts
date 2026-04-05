import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createGroupWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import { Button } from "../../ui/button/button";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";

interface CreateGroupWindowProps extends IBaseComponentProps {
    router: Router;
    onSubmit: (userIds: number[], contactNames: string) => void;
}

export class CreateGroupWindow extends BaseComponent<CreateGroupWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactList: ContactListWrapper | null = null;
    private submitButton: Button | null = null;
    private SearchField: SearchForm | null = null;
    private selectedUsers: Map<number, string> = new Map(); 

    constructor(props: CreateGroupWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
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

        this.contactList = new ContactListWrapper({
            router: this.props.router,
            listMode: "createGroup",
            onAction: (contactId: number, isSelected?: boolean, contactName?: string) => {
                if (isSelected && contactName) {
                    this.selectedUsers.set(contactId, contactName);
                } else {
                    this.selectedUsers.delete(contactId);
                }
                console.log("Выбранные пользователи:", Array.from(this.selectedUsers));
                // todo проверить чек боксы и юзеров в списке контактов
            }
        });

        this.actionLayout = new ActionLayout({
            header: this.actionHeader,
            content: [this.SearchField, this.contactList],
        });
        this.actionLayout.mount(layoutSlot as HTMLElement);

        this.submitButton = new Button({
            label: "Создать группу",
            class: "create-group-submit-btn ui-button__primary",
            onClick: () => {
                if (this.selectedUsers.size === 0) {
                    alert("Выберите хотя бы одного пользователя!");
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

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.actionLayout?.unmount();
        this.actionHeader?.unmount();
        this.contactList?.unmount();
        this.submitButton?.unmount();
        this.selectedUsers.clear();
    }
}