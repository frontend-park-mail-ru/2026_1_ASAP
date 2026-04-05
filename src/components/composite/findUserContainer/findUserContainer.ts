import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { FindUserForm } from "../findUserForm/findUserForm";
import template from "./findUserContainer.hbs";

interface FindUserContainerProps extends IBaseComponentProps {
    onSubmitSearch: (login: string) => void;
    showEmptyMessage: boolean;
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
                this.props.onSubmitSearch(login);
            }
        });

        this.form.mount(formSlot as HTMLElement);
    }

    protected beforeUnmount(): void {
        this.form?.unmount();
    }
}