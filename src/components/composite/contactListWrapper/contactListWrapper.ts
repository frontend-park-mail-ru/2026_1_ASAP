import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Router } from "../../../core/router";
import { ContactListItem } from "../contactListItem/contactListItem";
import template from "./contactListWrapper.hbs";

interface ContactListWrapperProps extends IBaseFormProps {
    router: Router,
    listMode?: 'default' | 'createDialog' | 'createGroup';
    onAction?: (contactId: number, isSelected?: boolean) => void;
};

export class ContactListWrapper extends BaseForm<ContactListWrapperProps> {
    private contactListItem: ContactListItem | null = null;

    constructor(props: ContactListWrapperProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    protected afterMount(): void {
        if (!this.element) return;

        this.contactListItem = new ContactListItem({
            router: this.props.router,
            listMode: this.props.listMode,
            onAction: this.props.onAction,
        });
        this.contactListItem.mount(this.element!);
    };

    public setActiveContact = (contactId: number | null) => {
        if (this.contactListItem) {
            this.contactListItem.setActiveContact(contactId);
        }
    };

    protected beforeUnmount(): void {
        this.contactListItem?.unmount();
        this.contactListItem = null;
    };
};