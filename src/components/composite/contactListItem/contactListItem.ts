import { BaseComponent } from "../../../core/base/baseComponent";
import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Router } from "../../../core/router";
import { contactService } from "../../../services/contactService";
import { Button } from "../../ui/button/button";
import { Checkbox } from "../../ui/checkbox/checkbox";
import { ContactItem } from "../contactItem/contactItem";
import template from "./contactListItem.hbs";


/**
 * @interface ContactListItemProps
 * @description Свойства для компонента списка контактов.
 * @extends IBaseFormProps
 * @property {Router} router - Экземпляр роутера для навигации.
 * @property {'default' | 'createDialog' | 'createGroup'} [listMode='default'] - Режим отображения списка, влияющий на элементы управления.
 * @property {Function} [onAction] - Колбэк для действий в режимах 'createDialog' или 'createGroup'.
 */
interface ContactListItemProps extends IBaseFormProps {
    router: Router,
    listMode?: 'default' | 'createDialog' | 'createGroup';
    onAction?: (contactId: number, isSelected: boolean, contactName?: string) => void;
};

/**
 * @class ContactListItem
 * @extends BaseForm
 * @description Компонент, отображающий список контактов.
 * Может работать в разных режимах: обычный просмотр, выбор для создания диалога,
 * или множественный выбор для создания группы.
 *
 * @property {ContactItem[]} contactItems - Массив экземпляров `ContactItem`.
 * @property {HTMLElement | null} emptyContactsList - Элемент, отображаемый при отсутствии контактов.
 */
export class ContactListItem extends BaseForm<ContactListItemProps> {
    private contactItems: ContactItem[] = [];
    private emptyContactsList: HTMLElement | null = null;
    private ActiveContactId: number | null = null;

    constructor(props: ContactListItemProps) {
        super(props);
    };

    getTemplate() {
        return template;
    }

    /**
     * Обработчик клика по контакту в режиме по умолчанию.
     * Осуществляет переход на страницу профиля контакта.
     * @param {ContactItem} contactItem - Экземпляр `ContactItem`, по которому кликнули.
     */
    handleClick = (contactItem: ContactItem) => {
        const id = contactItem.props.id;
        this.props.router.navigate(`/contacts/${id}`);
    };

    /**
     * Устанавливает активный контакт в списке, визуально выделяя его.
     * @param {number | null} contactId - ID контакта, который нужно сделать активным.
     */
    setActiveContact(contactId: number | null) {
        this.ActiveContactId = contactId;

        this.contactItems.forEach(contact => {
            if (this.element) {
                if (contact.props.id === contactId) {
                    contact.element.classList.add("contact-item--selected");
                    contact.element.classList.remove("contact-item");
                } else {
                    contact.element.classList.add("contact-item");
                    contact.element.classList.remove("contact-item--selected");
                }
            }
        })
    };

    /**
     * Выполняется после монтирования компонента.
     * Загружает контакты, создает и монтирует `ContactItem` для каждого.
     * В зависимости от `listMode` добавляет соответствующие элементы управления
     * (кнопки или чекбоксы) или устанавливает обработчик для перехода к профилю.
     * @protected
     */
    protected afterMount(): void {
        this.contactItems = [];
        contactService.getContacts().then(contacts => {
            if (!this.element) {
                console.error("Элемент contact-list-item не существует");
                return;
            };

            if (contacts.length === 0) {
                this.element.classList.add('contact-list--empty');
                this.emptyContactsList = document.createElement('p');
                this.emptyContactsList.className = 'no-contacts';
                this.emptyContactsList.innerHTML = "У вас пока нет контактов,<br> Скорее найдите кого-нибудь!";
                this.element.appendChild(this.emptyContactsList);
                return;
            }

            contacts.forEach(contact => {
                let rightControl: BaseComponent<any> | undefined = undefined;
                let onRowClick: ((item: ContactItem) => void) | undefined = undefined;
                const mode = this.props.listMode || 'default';
                
                switch (mode) {
                    case 'createDialog':
                        rightControl = new Button({
                            class: "create-dialog-btn",
                            icon: "/assets/images/icons/createChatMenuIcons/createNewChat.svg",
                            onClick: () => {
                                if (this.props.onAction) { 
                                    this.props.onAction(contact.contact_user_id, true, contact.contact_name);};
                            }
                        });
                        break;
                    case 'createGroup':
                        rightControl = new Checkbox({
                            name: `user_${contact.contact_user_id}`,
                            onChange: (isChecked: boolean) => {
                                if (this.props.onAction) {
                                    this.props.onAction(contact.contact_user_id, isChecked, contact.contact_name);
                                }
                            }
                        });
                        break;
                    default:
                    onRowClick = () => {
                        this.props.router.navigate(`/contacts/${contact.contact_user_id}`);
                    };
                    break;
                }


                const contactItem = new ContactItem({
                    avatarUrl: contact.avatarURL,
                    name: contact.contact_name,
                    id: contact.contact_user_id,
                    onClick: onRowClick,
                    rightSlot: rightControl,
                });
                contactItem.mount(this.element!);
                if (!onRowClick && contactItem.element) {
                    contactItem.element.style.borderBottom = "none";
                    contactItem.element.style.cursor = "default";
                }
                this.contactItems.push(contactItem);    
            });
            this.setActiveContact(this.ActiveContactId);
        });
    };

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает DOM и внутреннее состояние, удаляя все `ContactItem`.
     * @protected
     */
    protected beforeUnmount(): void {
        this.emptyContactsList?.remove();
        this.contactItems.forEach(contactItem => contactItem.unmount());
        this.contactItems = null;
    };

    protected async onSubmit(data: { [key: string]: string | File; }): Promise<void> {

    }
};