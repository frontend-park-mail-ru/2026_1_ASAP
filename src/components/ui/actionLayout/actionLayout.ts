import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import template from "./actionLayout.hbs";


interface ActionLayoutProps extends IBaseComponentProps {
    header: BaseComponent;
    content: BaseComponent | BaseComponent[];
}

export class ActionLayout extends BaseComponent<ActionLayoutProps> {
    constructor(props: ActionLayoutProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            console.error("ActionLayout: нет элемента для монтирования");
            return;
        }
        const headerSlot = this.element.querySelector('.action-layout__header');
        const contentSlot = this.element.querySelector('.action-layout__content');
        
        if (headerSlot) {
            this.props.header.mount(headerSlot as HTMLElement);
        } else {
            console.error("ActionLayout: не найден слот для заголовка");
        }

        if (contentSlot) {
            if (Array.isArray(this.props.content)) {
                this.props.content.forEach(component => component.mount(contentSlot as HTMLElement));
            } else {
                this.props.content.mount(contentSlot as HTMLElement);
            }
        }
    }

    protected beforeUnmount(): void {
        this.props.header?.unmount();
        if (Array.isArray(this.props.content)) {
            this.props.content.forEach(component => component?.unmount());
        } else {
            this.props.content?.unmount();
        }
    }
}