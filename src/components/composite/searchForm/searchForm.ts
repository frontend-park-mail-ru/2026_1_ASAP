import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm';
import { Input } from '../../ui/input/input';
import { Button } from '../../ui/button/button';
import { Avatar } from '../../ui/avatar/avatar';
import template from "./searchForm.hbs";

/**
 * @interface SearchFormProps - Свойства для SearchForm.
 */
interface SearchFormProps extends IBaseFormProps {}

/**
 * Панель поиска с полем ввода, иконкой поиска и кнопкой добавления.
 */
export class SearchForm extends BaseForm<SearchFormProps> {
    private searchImg: Avatar | null = null;
    private input: Input | null = null;
    private deleteButton: Button | null = null;
    private addButton: Button | null = null;

    constructor(props: SearchFormProps = {}) {
        super(props);
    }

    public getTemplate(): (context?: any) => string {
        return template;
    }

    protected afterMount(): void {
        super.afterMount();
        if (!this.element) return;

        const searchPanel = this.element.querySelector('.search-panel');
        if (!searchPanel) {
            console.error("SearchForm: .search-panel not found.");
            return;
        }

        this.searchImg = new Avatar({ 
            src: "/assets/images/icons/searchIcon.svg", 
            class: "search-icon" 
        });
        this.searchImg.mount(searchPanel as HTMLElement);

        this.input = new Input({ 
            type: "text", 
            placeholder: "Поиск", 
            name: "search", 
            class: "search-line", 
            showErrorText: false });
        this.input.mount(searchPanel as HTMLElement);

        this.deleteButton = new Button({ 
            class: "delete-button", 
            icon: "/assets/images/icons/deleteIcon.svg" 
        });
        this.deleteButton.mount(searchPanel as HTMLElement);

        const addButtonContainer = this.element.querySelector('.add-button-cont');
        if (addButtonContainer) {
            this.addButton = new Button({ 
                class: "add-button", 
                icon: "/assets/images/icons/deleteIcon.svg", 
                daughterClass: "add-icon"
            });
            this.addButton.mount(addButtonContainer as HTMLElement);
        }
    }

    protected beforeUnmount(): void {
        super.beforeUnmount();
        this.searchImg?.unmount();
        this.input?.unmount();
        this.deleteButton?.unmount();
        this.addButton?.unmount();
    }
    
    protected async onSubmit(data: { [key: string]: string | File; }): Promise<void> {
        console.log("Search form submitted with data:", data);
    }
}