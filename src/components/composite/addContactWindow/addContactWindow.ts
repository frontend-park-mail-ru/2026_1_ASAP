import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { FindUserContainer } from "../findUserContainer/findUserContainer";
import { Button } from "../../ui/button/button";
import template from './addContactWindow.hbs';

interface AddContactWindowProps extends IBaseComponentProps {
    onBack: () => void;
    onSubmitSearch: (login: string) => Promise<string | void> | void;
}

export class AddContactWindow extends BaseComponent<AddContactWindowProps> {
    private layout: ActionLayout | null = null;
    private header: ActionHeader | null = null;
    private container: FindUserContainer | null = null;

    constructor(props: AddContactWindowProps) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const backBtn = new Button({
            class: "back-button", 
            icon: "/assets/images/icons/arrow_left_alt.svg",
            onClick: this.props.onBack
        });

        this.header = new ActionHeader({
            backButton: backBtn,
            content: "Добавить контакт"
        });

        this.container = new FindUserContainer({
            showEmptyMessage: false,
            onSubmitSearch: this.props.onSubmitSearch,
            labelButton: "Создать контакт",
            labelInput: "Введите логин:",
            labelTitle: "Создайте новый контакт"
        });

        this.layout = new ActionLayout({
            header: this.header,
            content: this.container,
        });

        this.layout.mount(this.element);
    }

    protected beforeUnmount(): void {
        this.layout?.unmount();
        this.header?.unmount();
        this.container?.unmount();
    }
}