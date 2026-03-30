import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Router } from "../../../core/router";
import template from "./contactListItem.hbs";

interface ContactListItemProps extends IBaseFormProps {
    router: Router,
};

export class ContactListItem extends BaseForm<ContactListItemProps> {
    constructor(props: ContactListItemProps) {
        super(props);
    };

    getTemplate() {
        return template;
    }

    setActiveContact(contactId: string | null) {};
};