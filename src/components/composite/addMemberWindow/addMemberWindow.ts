import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from './addMemberWindow.hbs';
import './addMemberWindow.css';
import { ActionLayout } from "../../ui/actionLayout/actionLayout";
import { ActionHeader } from "../../ui/actionHeader/actionHeader";
import { Button } from "../../ui/button/button";
import { FindUserContainer } from "../findUserContainer/findUserContainer";

/**
 * @interface AddMemberWindowProps
 * @description Свойства для окна добавления участника в группу по логину.
 * @property {Function} onBack — Колбэк для возврата к предыдущему экрану.
 * @property {Function} onSubmitSearch — Колбэк поиска пользователя по логину и добавления в группу.
 */
interface AddMemberWindowProps extends IBaseComponentProps {
    onBack: () => void;
    onSubmitSearch: (login: string) => Promise<string | void> | void;
}

/**
 * @class AddMemberWindow
 * @extends BaseComponent
 * @description Компонент для добавления нового участника в группу по логину.
 * Переиспользует FindUserContainer для поиска пользователя.
 */
export class AddMemberWindow extends BaseComponent<AddMemberWindowProps> {
    private actionLayout: ActionLayout | null = null;
    private actionHeader: ActionHeader | null = null;
    private layoutContent: FindUserContainer | null = null;

    constructor(props: AddMemberWindowProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();

        if (!this.element) return;

        const layoutSlot = this.element.querySelector('[data-component="layout-slot"]');

        this.actionHeader = new ActionHeader({
            backButton: new Button({
                label: "Назад",
                class: "add-member-window__back-button",
                onClick: () => this.props.onBack()
            }),
            content: "Добавить участника"
        });

        this.layoutContent = new FindUserContainer({
            showEmptyMessage: false,
            onSubmitSearch: (login: string) => {
                return this.props.onSubmitSearch(login);
            },
            labelButton: "Добавить",
            labelInput: "Введите логин пользователя:",
            labelTitle: "Найдите пользователя по логину"
        });

        this.actionLayout = new ActionLayout({
            header: this.actionHeader,
            content: this.layoutContent,
        });
        this.actionLayout.mount(layoutSlot as HTMLElement);
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.actionLayout?.unmount();
        this.actionHeader?.unmount();
        this.layoutContent?.unmount();
    }
}
