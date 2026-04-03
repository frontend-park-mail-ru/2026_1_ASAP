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
}

export class CreateGroupWindow extends BaseComponent<CreateGroupWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactList: ContactListWrapper | null = null;
    private submitButton: Button | null = null;
    private SearchField: SearchForm | null = null;
    private selectedUserIds: Set<number> = new Set(); 

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
            onAction: (contactId: number, isSelected?: boolean) => {
                if (isSelected) {
                    this.selectedUserIds.add(contactId);
                } else {
                    this.selectedUserIds.delete(contactId);
                }
                console.log("Выбранные пользователи:", Array.from(this.selectedUserIds));
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
                const idsArray = Array.from(this.selectedUserIds);
                if (idsArray.length === 0) {
                    alert("Выберите хотя бы одного пользователя!");
                    return;
                }
                console.log("Отправляем запрос на создание группы с юзерами:", idsArray);
                // TODO: chatService.createGroup("Название группы", idsArray)
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
        this.selectedUserIds.clear();
    }
}