import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Router } from "../../../core/router";
import { contactService } from "../../../services/contactService";
import { ContactItem } from "../contactItem/contactItem";
import template from "./contactListItem.hbs";

const CURRENT_USER = 'bob';

interface ContactListItemProps extends IBaseFormProps {
    router: Router,
};

export class ContactListItem extends BaseForm<ContactListItemProps> {
    private contactItems: ContactItem[] = [];
    private emptyContactsList: HTMLElement | null = null;

    constructor(props: ContactListItemProps) {
        super(props);
    };

    getTemplate() {
        return template;
    }

    handleClick = (contactItem: ContactItem) => {
        const id = contactItem.props.id;
        this.props.router.navigate(`/contacts/${id}`);
    };

    setActiveContact(contactId: number | null) {
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
                const contactItem = new ContactItem({
                    avatarUrl: contact.avatarURL,
                    name: contact.contact_name,
                    id: contact.contact_user_id,
                    onClick: this.handleClick,
                });
                contactItem.mount(this.element!);
                this.contactItems.push(contactItem);
            });
        });
    };

    protected beforeUnmount(): void {
        this.emptyContactsList?.remove();
        this.contactItems.forEach(contactItem => contactItem.unmount());
        this.contactItems = null;
    };
};