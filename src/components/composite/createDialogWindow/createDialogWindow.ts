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

/**
 * @interface CreateDialogWindowProps
 * @description Свойства для компонента окна создания диалога.
 * @extends IBaseComponentProps
 * @property {Router} router - Экземпляр роутера.
 * @property {Function} onSubmit - Колбэк, вызываемый при выборе контакта для создания диалога.
 * @property {Function} onSubmitSearch - Колбэк, вызываемый при поиске нового пользователя.
 */
interface CreateDialogWindowProps extends IBaseComponentProps {
    router: Router;
    onSubmit: (contactId: number, contactName: string) => void;
    onSubmitSearch: (login: string) => void;
}

/**
 * @class CreateDialogWindow
 * @extends BaseComponent
 * @description Компонент, представляющий собой интерфейс для создания нового диалога.
 * Позволяет выбрать существующий контакт или найти нового пользователя для начала общения.
 *
 * @property {ActionLayout | null} actionLayout - Основной макет окна.
 * @property {ActionHeader | null} actionHeader - Шапка окна с кнопкой "Назад" и заголовком.
 * @property {ContactListWrapper | null} contactList - Список контактов для выбора.
 * @property {SearchForm | null} SearchField - Поле для поиска по контактам.
 * @property {BaseComponent | null} layoutContent - Контентная часть, которая может быть либо списком контактов, либо формой поиска.
 */
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

    /**
     * Выполняется после монтирования компонента.
     * Асинхронно загружает контакты и в зависимости от их наличия
     * отображает либо список контактов (`ContactListWrapper`), либо
     * форму для поиска нового пользователя (`FindUserContainer`).
     * Инициализирует шапку, поле поиска и основной макет.
     * @protected
     */
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
                },
                labelButton: "Написать",
                labelInput: "Введите логин:",
                labelTitle: "У вас пока нет контактов, найдите кого-нибудь!"
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

    /**
     * Выполняется перед размонтированием компонента.
     * Размонтирует все дочерние компоненты для очистки ресурсов.
     * @protected
     */
    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.actionLayout?.unmount();
        this.actionHeader?.unmount();
        this.contactList?.unmount();
    }
}