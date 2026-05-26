import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createDialogWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactSearchList } from "../contactSearchList/contactSearchList";
import { Button } from "../../ui/button/button";
import { Router } from "../../../core/router";
import type { FrontendContact } from "../../../types/contact";
import type { SearchContactsResult } from "../../../types/search";

type SearchScope = 'contacts' | 'local';

/**
 * @interface CreateDialogWindowProps
 * @description Свойства для компонента окна создания диалога.
 * @property {Router} router - Экземпляр роутера.
 * @property {Function} onSubmit - Колбэк при выборе пользователя (из контактов или глобального поиска).
 */
interface CreateDialogWindowProps extends IBaseComponentProps {
    router: Router;
    contacts: FrontendContact[];
    onSearchContacts: (query: string, scope: SearchScope) => Promise<SearchContactsResult | null>;
    onSubmit: (contactId: number, contactName: string) => void;
}

/**
 * @class CreateDialogWindow
 * @extends BaseComponent
 * @description Окно создания диалога: показывает контакты с поиском и переключателем на глобальный поиск.
 * Клик по иконке «написать» в строке любого контакта (свой или из глобального поиска) запускает создание диалога.
 */
export class CreateDialogWindow extends BaseComponent<CreateDialogWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactSearchList: ContactSearchList | null = null;

    constructor(props: CreateDialogWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("CreateDialogWindow: нет элемента для монтирования");
            return;
        }

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

        this.contactSearchList = new ContactSearchList({
            router: this.props.router,
            contacts: this.props.contacts,
            listMode: 'createDialog',
            hideAddButton: true,
            onSearchContacts: this.props.onSearchContacts,
            onAction: (contactId: number, _isSelected?: boolean, contactName?: string) => {
                this.props.onSubmit(contactId, contactName || "Новый диалог");
            },
        });

        if (this.props.contacts.length === 0) {
            this.contactSearchList.activateGlobalSearch();
            this.contactSearchList.setSearchQuery("а");
        }

        this.actionLayout = new ActionLayout({
            header: this.actionHeader,
            content: [this.contactSearchList],
        });

        this.actionLayout.mount(this.element);
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.actionLayout?.unmount();
        this.actionHeader = null;
        this.contactSearchList = null;
        this.actionLayout = null;
    }
}
