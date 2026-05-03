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
    onSearch?: (query: string) => void;
    onAddClick?: () => void;
}

/**
 * Панель поиска с полем ввода, иконкой поиска и кнопкой добавления.
 */
export class SearchForm extends BaseForm<SearchFormProps> {
    private searchImg: Avatar | null = null;
    private input: Input | null = null;
    private deleteButton: Button | null = null;
    private addButton: Button | null = null;
    private addButtonImg: HTMLImageElement | null = null;
    private createChatMenu: CreateChatMenu | null = null;
    private isMenuOpen: boolean = false;
    private fabCloseAnimEnd: (() => void) | null = null;

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
            onInput: () => {
                if (this.input!.value !== "") {
                    if (!this.deleteButton?.element?.isConnected) {
                        this.deleteButton?.mount(searchPanel as HTMLElement);
                    }
                } else {
                    this.deleteButton?.unmount();
                }
                this.props.onSearch?.(this.input!.value);
            },
        });
        this.input.mount(searchPanel as HTMLElement);
        
        this.deleteButton = new Button({ 
            class: "delete-button", 
            icon: "/assets/images/icons/deleteIcon.svg",
            onClick: () => {
                this.input.value = "";
                this.deleteButton?.unmount();
                this.props.onSearch?.("");
            },
        });
        if (this.input.value !== "") {
            this.deleteButton?.mount(searchPanel as HTMLElement);
        }

        const addButtonContainer = this.element.querySelector('.add-button-cont');
        if (addButtonContainer && !this.props.hideAddButton) {
            this.addButton = new Button({
                class: "add-button",
                icon: "/assets/images/icons/addIcon.svg",
                daughterClass: "add-icon",
                onClick: () => {
                    if (this.props.onAddClick) {
                        this.props.onAddClick();
                        return;
                    }

                    if (!this.isMenuOpen) {
                        this.isMenuOpen = true;
                        this.animateFab('open');
                        const menuContainer = this.element.querySelector(".add-button-cont");
                        this.createChatMenu = new CreateChatMenu({
                            onCreateDialog: () => {
                                this.props.router.navigate("/chats/create-dialog");
                                this.closeFabMenu();
                            },
                            onCreateGroup: () => {
                                this.props.router.navigate("/chats/create-group");
                                this.closeFabMenu();
                            },
                            onCreateChannel: () => {
                                this.props.router.navigate("/chats/create-channel");
                                this.closeFabMenu();
                            },
                            onClose: () => {
                                this.closeFabMenu();
                            },
                        });
                        this.createChatMenu.mount(menuContainer as HTMLElement);
                    } else {
                        this.closeFabMenu();
                    }
                }
            });
            this.addButton.mount(addButtonContainer as HTMLElement);
            this.addButtonImg = this.addButton.element?.querySelector('img') ?? null;
        }
    }

    public focusInput(): void {
        const el = this.input?.element;
        if (!el) return;
        const inputEl = (el.tagName === 'INPUT' ? el : el.querySelector('input')) as HTMLInputElement | null;
        inputEl?.focus();
    }

    private animateFab(direction: 'open' | 'close'): void {
        const img = this.addButtonImg;
        if (!img) return;
        const toRemove = direction === 'open' ? 'icon-anim--spin-close' : 'icon-anim--spin-open';
        const toAdd    = direction === 'open' ? 'icon-anim--spin-open'  : 'icon-anim--spin-close';
        if (this.fabCloseAnimEnd) {
            img.removeEventListener('animationend', this.fabCloseAnimEnd);
            this.fabCloseAnimEnd = null;
        }

        img.classList.remove(toRemove);
        void img.offsetWidth;
        img.classList.add(toAdd);
        
        if (direction === 'close') {
            this.fabCloseAnimEnd = () => {
                img.classList.remove('icon-anim--spin-close');
                this.fabCloseAnimEnd = null;
            };
            img.addEventListener('animationend', this.fabCloseAnimEnd, { once: true });
        }
    }

    private closeFabMenu(): void {
        this.createChatMenu?.unmount();
        this.createChatMenu = null;
        this.isMenuOpen = false;
        this.animateFab('close');
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