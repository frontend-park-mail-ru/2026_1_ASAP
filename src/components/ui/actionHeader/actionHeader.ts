import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../button/button";
import template from "./actionHeader.hbs";


interface ActionHeaderProps extends IBaseComponentProps {
    backButton: Button;
    content: string;
    icon?: string;
}

export class ActionHeader extends BaseComponent<ActionHeaderProps> {
    constructor(props: ActionHeaderProps) {
        super(props);
        this.props.icon = props.icon || "";
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("ActionHeader: нет элемента для монтирования");
            return;
        }
        const headerSlot = this.element.querySelector('.action-header__back-button');
        const contentSlot = this.element.querySelector('.action-header__title');
        
        if (headerSlot) {
            this.props.backButton.mount(headerSlot as HTMLElement);
        } else {
            console.error("ActionHeader: не найден слот для кнопки назад");
        }

    }

    protected beforeUnmount(): void {
        this.props.backButton?.unmount();
    }
}