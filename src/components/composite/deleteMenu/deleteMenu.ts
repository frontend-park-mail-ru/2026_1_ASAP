import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from './deleteMenu.hbs';


interface DeleteMenuProps extends IBaseComponentProps {
    onClose(): void;
    onSubmitDelete(): void;
}

export class DeleteMenu extends BaseComponent<DeleteMenuProps> {
    private escButton: Button | null = null;
    private deleteButton: Button | null = null;
    private textContainer: HTMLElement | null = null


    constructor(props: DeleteMenuProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("deleteMenu: нет эллемента для монтирования");
            return;
        }
        const overlay = this.element.querySelector('[data-component="delete-menu-overlay"]');
        overlay.addEventListener('click', () => {
            this.props.onClose();
        });
        const mainContainer = this.element.querySelector('[data-component="delete-menu__container"]');

        const textContainer = mainContainer.querySelector('[data-component="delete-menu-info-container"]');
        textContainer.textContent = "Вы точно хотите удалить чат?";

        const buttonsContainer = mainContainer.querySelector('[data-component="delete-menu-buttons-container"]');
        this.escButton = new Button({
            label: "Отмена",
            class: "delete-menu__button--esc ui-button ui-button__secondary2",
            onClick: this.props.onClose,
        });
        this.escButton.mount(buttonsContainer as HTMLElement);

        this.deleteButton = new Button({
            label: "Удалить",
            class: "delete-menu__button--submit ui-button",
            onClick: () => {
                console.log("Удаление чата");
                this.props.onSubmitDelete();
            },
        });
        this.deleteButton.mount(buttonsContainer as HTMLElement);
    }

    protected beforeUnmount(): void {
        this.escButton?.unmount();
        this.deleteButton?.unmount();
    }    

}