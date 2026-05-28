import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createGroupWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactSearchList } from "../contactSearchList/contactSearchList";
import { Button } from "../../ui/button/button";
import { Router } from "../../../core/router";
import { InfoMenu } from "../infoMenu/infoMenu";
import { FrontendContact } from "../../../types/contact";
import type { SearchContactsResult } from "../../../types/search";

type SearchScope = 'contacts' | 'local';

interface CreateGroupWindowProps extends IBaseComponentProps {
    router: Router;
    contacts: FrontendContact[];
    onSearchContacts: (query: string, scope: SearchScope) => Promise<SearchContactsResult | null>;
    onSubmit: (userIds: number[], contactNames: string) => void;
}

export class CreateGroupWindow extends BaseComponent<CreateGroupWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactSearchList: ContactSearchList | null = null;
    private submitButton: Button | null = null;
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

        this.actionHeader = new ActionHeader({
            backButton: new Button({
                label: "Назад",
                class: "create-group-window__back-button",
                onClick: () => this.props.router.navigate('/chats') 
            }),
            content: "Выберите пользователей"
        });

        const contacts = this.props.contacts;

        this.contactSearchList = new ContactSearchList({
            router: this.props.router,
            contacts,
            listMode: "createGroup",
            hideAddButton: true,
            onSearchContacts: this.props.onSearchContacts,
            selectedContactIds: this.selectedUsers,
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
            content: [this.contactSearchList],
        });
        this.actionLayout.mount(layoutSlot as HTMLElement);

        if (contacts.length === 0) {
            this.contactSearchList.activateGlobalSearch();
            this.contactSearchList.setSearchQuery("а");
        }

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
        this.contactSearchList?.unmount();
        this.submitButton?.unmount();
        this.infoMenu?.unmount();
        this.selectedUsers.clear();
    }
}
