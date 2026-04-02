import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Avatar } from "../avatar/avatar";
import { Button } from "../button/button";
import template from "./contactItem.hbs";


interface ContactItemProps extends IBaseComponentProps {
    icon: Avatar;
    name: string;
    addButton: Button;
}

export class ContactItem extends BaseComponent<ContactItemProps> {
    constructor(props: ContactItemProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("ContactItem: нет элемента для монтирования");
            return;
        }
        const iconSlot = this.element.querySelector('.contact-item__icon');
        const nameSlot = this.element.querySelector('.contact-item__name');
        const addButtonSlot = this.element.querySelector('.contact-item__add-button');

        if (iconSlot) {
            this.props.icon.mount(iconSlot as HTMLElement);
        } else {
            console.error("ContactItem: не найден слот для иконки");
        }


        if (addButtonSlot) {
            this.props.addButton.mount(addButtonSlot as HTMLElement);
        } else {
            console.error("ContactItem: не найден слот для кнопки добавления");
        }
    }

    protected beforeUnmount(): void {
        this.props.icon?.unmount();
        this.props.addButton?.unmount();
    }
}