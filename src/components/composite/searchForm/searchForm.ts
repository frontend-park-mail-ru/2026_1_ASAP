import { BaseForm, IBaseFormProps } from '../../../core/base/baseForm';
import { Input } from '../../ui/input/input';
import { Button } from '../../ui/button/button';
import { Avatar } from '../../ui/avatar/avatar';
import template from "./searchForm.hbs";
import { CreateChatMenu } from '../createChatMenu/createChatMenu';    
import { Router } from '../../../core/router';

/**
 * @interface SearchFormProps - Свойства для SearchForm.
 */
interface SearchFormProps extends IBaseFormProps {
    router?: Router;
    hideAddButton?: boolean;
    class?: string;
    onSearch?: (query: string) => void; // для поиска
    onAddClick?: () => void; // для открытия меню создания контакта
}   

/**
 * Панель поиска с полем ввода, иконкой поиска и кнопкой добавления.
 */
export class SearchForm extends BaseForm<SearchFormProps> {
    private searchImg: Avatar | null = null;
    private input: Input | null = null;
    private deleteButton: Button | null = null;
    private addButton: Button | null = null;
    private createChatMenu: CreateChatMenu | null = null;
    private isMenuOpen: boolean = false;

    constructor(props: SearchFormProps = {}) {
        props.class = props.class || 'search';
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
            showErrorText: false,
            autocomplete: "off",
        });
        this.input.mount(searchPanel as HTMLElement);

        this.deleteButton = new Button({ 
            class: "delete-button", 
            icon: "/assets/images/icons/deleteIcon.svg",
        });
        this.deleteButton.mount(searchPanel as HTMLElement);

        const addButtonContainer = this.element.querySelector('.add-button-cont');
        if (addButtonContainer && !this.props.hideAddButton) {
            this.addButton = new Button({ 
                class: "add-button", 
                icon: "/assets/images/icons/deleteIcon.svg", 
                daughterClass: "add-icon",
                onClick: () => {
                    if (this.props.onAddClick) {
                        this.props.onAddClick();
                        return;
                    }
                    
                    if (!this.isMenuOpen) {
                        this.isMenuOpen = true;
                        const menuContainer = this.element.querySelector(".add-button-cont");
                        this.createChatMenu = new CreateChatMenu({
                            onCreateDialog: () => {
                                this.props.router.navigate("/chats/create-dialog");
                                this.createChatMenu?.unmount();
                                this.isMenuOpen = false;
                            },
                            onCreateGroup: () => {
                                this.props.router.navigate("/chats/create-group");
                                this.createChatMenu?.unmount();
                                this.isMenuOpen = false;
                            },
                            onCreateChannel: () => {
                                this.props.router.navigate("/chats/create-channel");
                                this.createChatMenu?.unmount();
                                this.isMenuOpen = false;
                            },
                            onClose: () => {
                                this.createChatMenu?.unmount();
                                this.createChatMenu = null;
                                this.isMenuOpen = false;
                            },    
                        })
                        this.createChatMenu.mount(menuContainer as HTMLElement);
                    } else {
                        this.createChatMenu?.unmount();
                        this.createChatMenu = null;
                        this.isMenuOpen = false;
                    }
                }
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

    protected OutsideClickHandler = (event: MouseEvent) => {
        if (this.isMenuOpen) {
             this.createChatMenu.unmount();
        }
    }
}