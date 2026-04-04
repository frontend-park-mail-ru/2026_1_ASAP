import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createDialogWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactListWrapper } from "../contactListWrapper/contactListWrapper";
import { Button } from "../../ui/button/button";
import { Router } from "../../../core/router";
import { SearchForm } from "../searchForm/searchForm";

interface CreateDialogWindowProps extends IBaseComponentProps {
    router: Router;
}

export class CreateDialogWindow extends BaseComponent<CreateDialogWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactList: ContactListWrapper | null = null;
    private SearchField: SearchForm | null = null;

    constructor(props: CreateDialogWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();
        
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

        this.contactList = new ContactListWrapper({
            router: this.props.router,
            listMode: 'createDialog',
            onAction: (contactId: number) => {
                console.log(`Клик по контакту ${contactId}. Здесь будет API запрос на создание диалога.`);
                // TODO: Вызвать chatService.createDialog(contactId)
                // TODO: Перенаправить роутер в созданный чат: this.props.router.navigate(`/chats/${newChatId}`)
            }
        });

        this.actionLayout = new ActionLayout({
            header: this.actionHeader,
            content: [this.SearchField, this.contactList],
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