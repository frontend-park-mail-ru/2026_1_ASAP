import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Router } from "../../../core/router";
import { contactService } from "../../../services/contactService";
import { Button } from "../../ui/button/button";
import { Checkbox } from "../../ui/checkbox/checkbox";
import { ContactItem } from "../contactItem/contactItem";
import template from "./contactListItem.hbs";
import { FrontendContact } from "../../../types/contact";
import { SearchContactHit } from "../../../types/search";


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
    contacts?: FrontendContact[];
    listMode?: 'default' | 'createDialog' | 'createGroup';
    selectedContactIds?: { has(contactId: number): boolean };
    onAction?: (contactId: number, isSelected: boolean, contactName?: string) => void;
    onContactsLoaded?: (contacts: FrontendContact[]) => void;
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
    private originalContacts: FrontendContact[] = [];
    private isSearchActive: boolean = false;
    private skeletonEls: HTMLElement[] = [];

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
    handleClick = async (contactItem: ContactItem) => {
        const profile = await contactService.getProfileInfo(contactItem.props.id);
        const login = profile?.additionalInfo?.login || String(contactItem.props.id);
        this.props.router.navigate(`/contacts/${login}`);
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

    public showSearchResults(hits: SearchContactHit[]): void {
        this.isSearchActive = true;
        const contacts = hits.map(hit => this.hitToContact(hit));
        this.renderContacts(contacts);
    }

    public showContactResults(local: SearchContactHit[], global: SearchContactHit[]): void {
        if (!this.element) return;
        this.isSearchActive = true;
        this.resetList();
        
        // Удаляем баннеры от предыдущих поисков
        this.element.querySelectorAll('.chat-list__system-row').forEach((el) => el.remove());

        if (local.length === 0 && global.length === 0) {
            this.element.classList.add('contact-list--empty');
            this.emptyContactsList = document.createElement('p');
            this.emptyContactsList.className = 'no-contacts';
            this.emptyContactsList.innerHTML = "Ничего не найдено";
            this.element.appendChild(this.emptyContactsList);
            return;
        }

        if (local.length > 0) {
            const localContacts = local.map(hit => this.hitToContact(hit));
            this.appendContacts(localContacts);
        }

        if (global.length > 0) {
            const banner = document.createElement('div');
            banner.className = 'chat-list__system-row';
            banner.textContent = 'Глобальный поиск';
            this.element.appendChild(banner);

            const globalContacts = global.map(hit => this.hitToContact(hit));
            this.appendContacts(globalContacts);
        }

        this.setActiveContact(this.ActiveContactId);
    }

    public restoreContactList(): void {
        this.isSearchActive = false;
        this.renderContacts(this.originalContacts);
    }

    private hitToContact(hit: SearchContactHit): FrontendContact {
        return {
            contact_user_id: hit.userId,
            contact_name: hit.displayName || hit.login || '',
            avatarURL: hit.avatarUrl ?? '',
        };
    }

    /**
     * Выполняется после монтирования компонента.
     * Запускает первичную загрузку списка контактов.
     * @protected
     */
    protected afterMount(): void {
        if (this.props.contacts) {
            this.originalContacts = this.props.contacts;
            this.renderContacts(this.originalContacts);
            this.props.onContactsLoaded?.(this.originalContacts);
            return;
        }

        // Пока бэк не отдал список — рисуем skeleton-строки, чтобы не было пустоты.
        this.showSkeletons(6);
        this.loadContacts();
    };

    /** Рисует N skeleton-строк контакта (avatar + 2 текстовые строки). */
    private showSkeletons(count: number): void {
        if (!this.element) return;
        this.clearSkeletons();
        for (let i = 0; i < count; i += 1) {
            const row = document.createElement('div');
            row.className = 'contact-list__skeleton';
            row.innerHTML = `
                <div class="contact-list__skeleton-avatar"></div>
                <div class="contact-list__skeleton-content">
                    <div class="contact-list__skeleton-line contact-list__skeleton-line--title"></div>
                    <div class="contact-list__skeleton-line contact-list__skeleton-line--subtitle"></div>
                </div>
            `;
            this.element.appendChild(row);
            this.skeletonEls.push(row);
        }
    }

    private clearSkeletons(): void {
        this.skeletonEls.forEach((el) => el.remove());
        this.skeletonEls = [];
    }

    /**
     * Перезагружает список контактов: сбрасывает текущие элементы и перезапрашивает данные.
     * Используется после изменения списка контактов извне (добавление/удаление).
     */
    public reload = (): void => {
        this.loadContacts();
    };

    /**
     * Сбрасывает текущий DOM и состояние списка перед рендером.
     */
    private resetList(): void {
        this.clearSkeletons();
        this.emptyContactsList?.remove();
        this.emptyContactsList = null;
        this.element?.classList.remove('contact-list--empty');
        this.contactItems.forEach(contactItem => contactItem.unmount());
        this.contactItems = [];
    }

    private renderContacts(contacts: FrontendContact[]): void {
        if (!this.element) return;
        this.resetList();
        
        // Удаляем системные строки от прошлых глобальных поисков
        this.element.querySelectorAll('.chat-list__system-row').forEach((el) => el.remove());

        if (contacts.length === 0) {
            this.element.classList.add('contact-list--empty');
            this.emptyContactsList = document.createElement('p');
            this.emptyContactsList.className = 'no-contacts';
            this.emptyContactsList.innerHTML = this.isSearchActive
                ? "Ничего не найдено"
                : "У вас пока нет контактов,<br> Скорее найдите кого-нибудь!";
            this.element.appendChild(this.emptyContactsList);
            return;
        }

        this.appendContacts(contacts);
        this.setActiveContact(this.ActiveContactId);
    }

    private appendContacts(contacts: FrontendContact[]): void {
        if (!this.element) return;

        contacts.forEach(contact => {
            let rightControl: BaseComponent<IBaseComponentProps> | undefined = undefined;
            let onRowClick: ((item: ContactItem) => void) | undefined = undefined;
            const mode = this.props.listMode || 'default';

            switch (mode) {
                case 'createDialog': {
                    const submitDialogContact = () => {
                        if (this.props.onAction) {
                            this.props.onAction(contact.contact_user_id, true, contact.contact_name);
                        }
                    };
                    onRowClick = submitDialogContact;
                    rightControl = new Button({
                        class: "create-dialog-btn",
                        icon: "/assets/images/icons/createChatMenuIcons/createNewChat.svg",
                        onClick: submitDialogContact,
                    });
                    break;
                }
                case 'createGroup':
                    rightControl = new Checkbox({
                        name: `user_${contact.contact_user_id}`,
                        checked: this.props.selectedContactIds?.has(contact.contact_user_id) ?? false,
                        onChange: (isChecked: boolean) => {
                            if (this.props.onAction) {
                                this.props.onAction(contact.contact_user_id, isChecked, contact.contact_name);
                            }
                        }
                    });
                    break;
                default:
                    onRowClick = async () => {
                        const profile = await contactService.getProfileInfo(contact.contact_user_id);
                        const login = profile?.additionalInfo?.login || String(contact.contact_user_id);
                        this.props.router.navigate(`/contacts/${login}`);
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
            }
            this.contactItems.push(contactItem);
        });
    }

    /**
     * Загружает контакты и рендерит их согласно текущему `listMode`.
     */
    private loadContacts(): void {
        contactService.getContacts().then(contacts => {
            this.originalContacts = contacts;
            this.renderContacts(contacts);
            this.props.onContactsLoaded?.(contacts);
        });
    }

    /**
     * Выполняется перед размонтированием компонента.
     * Очищает DOM и внутреннее состояние, удаляя все `ContactItem`.
     * @protected
     */
    protected beforeUnmount(): void {
        this.clearSkeletons();
        this.emptyContactsList?.remove();
        this.contactItems.forEach(contactItem => contactItem.unmount());
        this.contactItems = [];
    };

    protected async onSubmit(data: { [key: string]: string | File; }): Promise<void> {

    }
};
