import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FindUserForm } from "../findUserForm/findUserForm";
import template from "./findUserContainer.hbs";

interface FindUserContainerProps extends IBaseComponentProps {
    onSubmitSearch: (login: string) => Promise<string | void> | void;
    showEmptyMessage: boolean;
    labelButton?: string;
    labelInput?: string;
    labelTitle?: string;
}

export class FindUserContainer extends BaseComponent<FindUserContainerProps> {
    private form: FindUserForm | null = null;

    constructor(props: FindUserContainerProps) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        if (this.props.showEmptyMessage) {
            const label = "У вас пока нет контактов, найдите кого-нибудь!";
            this.element.querySelector('.find-user-container__message')!.textContent = label;
        }

        const formSlot = this.element.querySelector('[data-component="find-user-form-wrapper"]');
        
        this.form = new FindUserForm({
            onSubmitForm: (login: string) => {
                return this.props.onSubmitSearch(login);
            },
            labelButton: this.props.labelButton,
            labelInput: this.props.labelInput,
            labelTitle: this.props.labelTitle
        });

        this.form.mount(formSlot as HTMLElement);
    }

    protected beforeUnmount(): void {
        this.form?.unmount();
    }
}