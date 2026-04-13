import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Router } from "../../../core/router";
import { ContactListItem } from "../contactListItem/contactListItem";
import template from "./contactListWrapper.hbs";

/**
 * @interface ContactListWrapperProps
 * @description Свойства для компонента-обертки списка контактов.
 * @extends IBaseFormProps
 * @property {Router} router - Экземпляр роутера.
 * @property {'default' | 'createDialog' | 'createGroup'} [listMode] - Режим отображения списка.
 * @property {Function} [onAction] - Колбэк для действий с контактами.
 */
interface ContactListWrapperProps extends IBaseFormProps {
    router: Router,
    listMode?: 'default' | 'createDialog' | 'createGroup';
    onAction?: (contactId: number, isSelected?: boolean, contactName?: string) => void;
};

/**
 * @class ContactListWrapper
 * @extends BaseForm
 * @description Компонент-обертка, который инкапсулирует и управляет
 * компонентом `ContactListItem`. Служит для его инициализации и передачи свойств.
 *
 * @property {ContactListItem | null} contactListItem - Экземпляр компонента списка контактов.
 */
export class ContactListWrapper extends BaseForm<ContactListWrapperProps> {
    private contactListItem: ContactListItem | null = null;

    constructor(props: ContactListWrapperProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };

    /**
     * Выполняется после монтирования компонента.
     * Инициализирует и монтирует `ContactListItem` с переданными свойствами.
     * @protected
     */
    protected afterMount(): void {
        if (!this.element) return;

        this.contactListItem = new ContactListItem({
            router: this.props.router,
            listMode: this.props.listMode,
            onAction: this.props.onAction,
        });
        this.contactListItem.mount(this.element!);
    };

    /**
     * Делегирует установку активного контакта дочернему компоненту `ContactListItem`.
     * @param {number | null} contactId - ID контакта для выделения.
     */
    public setActiveContact = (contactId: number | null) => {
        if (this.contactListItem) {
            this.contactListItem.setActiveContact(contactId);
        }
    };

    /**
     * Выполняется перед размонтированием компонента.
     * Размонтирует дочерний `ContactListItem` для очистки ресурсов.
     * @protected
     */
    protected beforeUnmount(): void {
        this.contactListItem?.unmount();
        this.contactListItem = null;
    };
};