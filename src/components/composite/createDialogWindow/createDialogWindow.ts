import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './createDialogWindow.hbs';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { ContactItem } from "../../ui/contactItem/contactItem";
import { Button } from "../../ui/button/button";
import { Avatar } from "../../ui/avatar/avatar";

interface CreateDialogWindowProps extends IBaseComponentProps {
}

export class CreateDialogWindow extends BaseComponent<CreateDialogWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private contactItem: ContactItem | null = null;

    constructor(props: CreateDialogWindowProps) {
        super(props);
    }

    getTemplate(){
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("CreateDialogWindow: нет элемента для монтирования");
            return;
        }
        const actionLayoutSlot = this.element.querySelector(".createDialogWindow");

        this.actionHeader = new ActionHeader({
            backButton: new Button({
                label: "Назад",
            }),
            content: "Выберите пользователя для создания диалога"
        });

        this.contactItem  = new ContactItem({
            icon: new Avatar({
                src: "/assets/images/avatars/avatar1.png",
            }),
            name: "Пользователь 1",
            addButton: new Button({
                label: "Добавить",
            })
        });

        this.actionLayout = new ActionLayout({
            header: this.actionHeader,
            content: this.contactItem,
        });

        if (actionLayoutSlot) {
            this.actionLayout.mount(actionLayoutSlot as HTMLElement);
        } else {
            console.error("CreateDialogWindow: не найден слот для ActionLayout");
        }
    }

    protected beforeUnmount(): void {
        this.actionLayout?.unmount();
        this.actionHeader?.unmount();
        this.contactItem?.unmount();
    }

}