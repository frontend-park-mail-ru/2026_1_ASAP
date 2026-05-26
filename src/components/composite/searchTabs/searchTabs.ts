import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './searchTabs.hbs';

export type SearchTab = 'dialog' | 'group' | 'channel' | 'contact';

export interface SearchTabsProps extends IBaseComponentProps {
    activeTab: SearchTab;
    onChange: (tab: SearchTab) => void;
}

export class SearchTabs extends BaseComponent<SearchTabsProps> {
    private buttons: HTMLButtonElement[] = [];

    constructor(props: SearchTabsProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.buttons = Array.from(this.element.querySelectorAll('.search-tabs__btn'));
        this.buttons.forEach((btn) => {
            btn.addEventListener('click', this.handleClick);
        });
        this.applyActiveState(this.props.activeTab);
    }

    protected beforeUnmount(): void {
        this.buttons.forEach((btn) => {
            btn.removeEventListener('click', this.handleClick);
        });
        this.buttons = [];
    }

    public setActiveTab(tab: SearchTab): void {
        this.props.activeTab = tab;
        this.applyActiveState(tab);
    }

    public getActiveTab(): SearchTab {
        return this.props.activeTab;
    }

    /** Показывает/скрывает контейнер табов целиком. */
    public toggleVisible(visible: boolean): void {
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
    }

    private handleClick = (event: Event): void => {
        const btn = event.currentTarget as HTMLButtonElement;
        const tab = btn.dataset.tab as SearchTab | undefined;
        if (!tab || tab === this.props.activeTab) return;

        this.setActiveTab(tab);
        this.props.onChange(tab);
    };

    private applyActiveState(activeTab: SearchTab): void {
        this.buttons.forEach((btn) => {
            const isActive = btn.dataset.tab === activeTab;
            btn.classList.toggle('search-tabs__btn--active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
        });
    }
}
