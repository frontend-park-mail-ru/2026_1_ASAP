import { BaseComponent } from "../../../core/base/baseComponent";
import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import template from "./contactItem.hbs";

interface ContactItemProps extends IBaseFormProps {
    avatarUrl?: string;
    name: string;
    id: number;
    onClick?: (item: ContactItem) => void;
    rightSlot?: BaseComponent<any>;
};

export class ContactItem extends BaseForm<ContactItemProps> {
    private avatar: Avatar | null = null;

    constructor(props: ContactItemProps) {
        super(props);
    };

    public getTemplate(): (context?: object) => string {
        return template;
    }

    protected afterMount() {
        if (!this.element) return;

        this.avatar = new Avatar({
            src: this.props.avatarUrl,
        });
        this.avatar.mount(this.element.querySelector('[data-component="contact-item-avatar-slot"]')!);

        if (this.props.onClick) {
            this.element?.addEventListener('click', this.handleClick);
        }

        if (this.props.rightSlot) {
            const controlSlot = this.element.querySelector('[data-component="contact-item-control-slot"]');
            if (controlSlot) {
                this.props.rightSlot.mount(controlSlot as HTMLElement);
            }
        }
    };

    private handleClick = () => {
        if (this.props.onClick) {
            this.props.onClick(this);
        }
    };

    protected beforeUnmount() {
        if (this.props.onClick) {
            this.element?.removeEventListener('click', this.handleClick);
        }
        this.avatar?.unmount();
    }


};