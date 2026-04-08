import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import template from './infoMenu.hbs';

interface InfoMenuProps extends IBaseComponentProps {
    message: string;
    onClose(): void;
}

export class InfoMenu extends BaseComponent<InfoMenuProps> {
    private okButton: Button | null = null;

    constructor(props: InfoMenuProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) {
            return;
        }

        const overlay = this.element.querySelector('[data-component="info-menu-overlay"]');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.props.onClose();
            });
        }

        const mainContainer = this.element.querySelector('[data-component="info-menu__container"]');
        if (!mainContainer) return;

        const textContainer = mainContainer.querySelector('[data-component="info-menu-text-container"]');
        if (textContainer) {
            textContainer.textContent = this.props.message;
        }

        const buttonsContainer = mainContainer.querySelector('[data-component="info-menu-buttons-container"]');
        if (buttonsContainer) {
            this.okButton = new Button({
                label: "Ок",
                class: "info-menu__button--ok ui-button ui-button__primary",
                onClick: this.props.onClose,
            });
            this.okButton.mount(buttonsContainer as HTMLElement);
        }
    }

    protected beforeUnmount(): void {
        this.okButton?.unmount();
    }    
}
