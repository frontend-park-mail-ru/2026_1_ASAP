import { BaseForm, IBaseFormProps } from "../../../core/base/baseForm";
import { Avatar } from "../../ui/avatar/avatar";
import template from "./contactItem.hbs";

interface ContactItemProps extends IBaseFormProps {
    avatarUrl?: string;
    name: string;
    class: string;
    onClick?: (item: ContactItem) => void;
};

export class ContactItem extends BaseForm<ContactItemProps> {
    private avatar: Avatar | null = null;

    constructor(props: ContactItemProps) {
        super(props);
        this.props.src = props.avatarUrl;
        this.props.name = props.name;
    };

    public getTemplate(): (context?: object) => string {
        return template;
    }

    protected afterMount() {
        if (!this.element) return;

        this.avatar = new Avatar({
            src: this.props.src,
        });
        this.avatar.mount(this.element.querySelector('[data-component="contact-item-avatar-slot"]'));

        if (this.props.onClick) {
            this.element?.addEventListener('click', this.handleClick);
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