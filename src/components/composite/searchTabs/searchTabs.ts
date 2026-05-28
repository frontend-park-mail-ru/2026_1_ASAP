import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import template from './searchTabs.hbs';

export type SearchTab = 'dialog' | 'group' | 'channel' | 'contact';

export interface SearchTabsProps extends IBaseComponentProps {
    activeTab: SearchTab;
    onChange: (tab: SearchTab) => void;
}

export class SearchTabs extends BaseComponent<SearchTabsProps> {
    private buttons: HTMLButtonElement[] = [];
    private inkEl: HTMLElement | null = null;

    constructor(props: SearchTabsProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.buttons = Array.from(this.element.querySelectorAll('.search-tabs__btn'));
        this.inkEl = this.element.querySelector('.search-tabs__ink');
        this.buttons.forEach((btn) => {
            btn.addEventListener('click', this.handleClick);
        });
        // Первый кадр — без анимации, чтобы «чернила» не выезжали с x=0
        // в стартовую позицию при монтировании. Дальше переход включается обратно.
        this.applyActiveState(this.props.activeTab, /* skipTransition */ true);
    }

    protected beforeUnmount(): void {
        this.buttons.forEach((btn) => {
            btn.removeEventListener('click', this.handleClick);
        });
        this.buttons = [];
        this.inkEl = null;
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

    private applyActiveState(activeTab: SearchTab, skipTransition = false): void {
        let activeBtn: HTMLButtonElement | null = null;
        this.buttons.forEach((btn) => {
            const isActive = btn.dataset.tab === activeTab;
            btn.classList.toggle('search-tabs__btn--active', isActive);
            btn.setAttribute('aria-selected', String(isActive));
            if (isActive) activeBtn = btn;
        });
        this.moveInk(activeBtn, skipTransition);
    }

    /** Двигает «чернильную» подложку под активный таб. */
    private moveInk(target: HTMLButtonElement | null, skipTransition: boolean): void {
        if (!this.inkEl || !target) return;
        const ink = this.inkEl;

        const apply = () => {
            ink.style.width = `${target.offsetWidth}px`;
            ink.style.transform = `translateX(${target.offsetLeft}px)`;
        };

        if (skipTransition) {
            // Гасим transition на один кадр, ставим позицию, потом возвращаем —
            // иначе ink при первом маунте поедет с x=0 в стартовое положение.
            const prev = ink.style.transition;
            ink.style.transition = 'none';
            apply();
            // Force reflow, затем восстанавливаем transition.
            void ink.offsetWidth;
            ink.style.transition = prev;
            return;
        }
        apply();
    }
}
