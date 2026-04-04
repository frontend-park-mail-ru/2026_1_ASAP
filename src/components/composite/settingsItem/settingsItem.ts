import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Avatar } from "../../ui/avatar/avatar";
import template from "./settingsItem.hbs";

interface SettingsItemProps extends IBaseComponentProps {
    src: string;
    class?: string;
    title: string;
    onClick?: () => void;
};

export class SettingsItem extends BaseComponent<SettingsItemProps> {
    private settingIcon: Avatar | null = null;
    private settingName: HTMLElement | null = null;

    constructor(props: SettingsItemProps) {
        super(props);
    };

    getTemplate() {
        return template;
    };
    
    protected afterMount(): void {
        this.settingIcon = new Avatar({
            class: 'setting-icon',
            src: this.props.src
        });
        this.settingIcon.mount(this.element!);
        this.settingName = document.createElement('p');
        if (this.props.class) this.settingName.classList.add(this.props.class);
        this.settingName.textContent = this.props.title;
        this.element!.appendChild(this.settingName);

        if (this.props.onClick)
            this.element!.addEventListener('click', this.props.onClick);
    };

    protected beforeUnmount(): void {
        this.settingIcon?.unmount();
        this.settingName?.remove();
        if (this.props.onClick) 
            this.element!.removeEventListener('click', this.props.onClick);
    };
};