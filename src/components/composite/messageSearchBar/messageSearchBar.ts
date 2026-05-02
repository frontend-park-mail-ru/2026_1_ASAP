import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { Input } from '../../ui/input/input';
import { Button } from '../../ui/button/button';
import { SearchResultItem } from '../searchResultItem/searchResultItem';
import { chatService } from '../../../services/chatService';
import { SearchMessageHit } from '../../../types/search';
import template from './messageSearchBar.hbs';
import './messageSearchBar.scss';

interface MessageSearchBarProps extends IBaseComponentProps {
    chatId: string;
    chatType: 'dialog' | 'group' | 'channel';
    currentUserId: number;
    onClose: () => void;
    onResults: (query: string, hits: SearchMessageHit[]) => void;
    onJumpTo: (messageId: string) => void;
}

export class MessageSearchBar extends BaseComponent<MessageSearchBarProps> {
    private inputComponent: Input | null = null;
    private closeButton: Button | null = null;
    private resultItems: SearchResultItem[] = [];

    private query = '';
    private items: SearchMessageHit[] = [];
    private selectedMessageId: string | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private requestId = 0;

    constructor(props: MessageSearchBarProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const inputSlot = this.element.querySelector('[data-component="msb-input-slot"]');
        if (inputSlot) {
            this.inputComponent = new Input({
                type: 'text',
                placeholder: 'Поиск',
                name: 'msg-search',
                class: 'search-line',
                showErrorText: false,
                autocomplete: 'off',
                onInput: () => this.handleInput(),
            });
            this.inputComponent.mount(inputSlot as HTMLElement);
            setTimeout(() => {
                const el = this.inputComponent?.element?.querySelector('input');
                el?.focus();
            }, 50);
        }

        const closeSlot = this.element.querySelector('[data-component="msb-close-slot"]');
        if (closeSlot) {
            this.closeButton = new Button({
                class: 'msg-search-bar__close-btn',
                icon: '/assets/images/icons/deleteIcon.svg',
                onClick: () => this.props.onClose(),
            });
            this.closeButton.mount(closeSlot as HTMLElement);
        }
    }

    private setResultsVisible(visible: boolean): void {
        this.element?.querySelector('.msg-search-bar__results')
            ?.classList.toggle('msg-search-bar__results--visible', visible);
    }

    private handleInput(): void {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        const value = this.inputComponent?.value?.trim() ?? '';

        if (!value) {
            this.query = '';
            this.items = [];
            this.selectedMessageId = null;
            this.setResultsVisible(false);
            this.renderResults();
            this.props.onResults('', []);
            return;
        }

        this.debounceTimer = setTimeout(() => this.runSearch(value, true), 300);
    }

    private async runSearch(q: string, reset: boolean): Promise<void> {
        this.requestId += 1;
        const myId = this.requestId;

        this.setLoading(true);

        const result = await chatService.searchMessages(this.props.chatId, q, reset ? null : undefined);

        if (myId !== this.requestId) return;

        this.setLoading(false);
        this.query = q;

        if (!result) {
            this.showError();
            return;
        }

        this.items = reset ? result.items : [...this.items, ...result.items];
        this.selectedMessageId = null;
        this.renderResults();
        this.props.onResults(q, this.items);
    }

    private renderResults(): void {
        if (!this.element) return;
        const list = this.element.querySelector('.msg-search-bar__list');
        const emptyEl = this.element.querySelector<HTMLElement>('.msg-search-bar__empty');
        if (!list || !emptyEl) return;

        this.resultItems.forEach(item => item.unmount());
        this.resultItems = [];
        list.innerHTML = '';

        if (this.items.length === 0 && this.query) {
            this.setResultsVisible(true);
            emptyEl.style.display = 'flex';
            return;
        }
        emptyEl.style.display = 'none';
        this.setResultsVisible(this.items.length > 0);

        this.items.forEach(hit => {
            const item = new SearchResultItem({
                hit,
                query: this.query,
                isSelected: this.selectedMessageId === hit.messageId,
                onClick: () => {
                    this.selectedMessageId = hit.messageId;
                    this.resultItems.forEach(ri => ri.setSelected(ri.getMessageId() === hit.messageId));
                    this.props.onJumpTo(hit.messageId);
                },
            });
            item.mount(list as HTMLElement);
            this.resultItems.push(item);
        });
    }

    private setLoading(on: boolean): void {
        const el = this.element?.querySelector<HTMLElement>('.msg-search-bar__loading');
        if (el) el.style.display = on ? 'flex' : 'none';
        if (on) this.setResultsVisible(true);
    }

    private showError(): void {
        const emptyEl = this.element?.querySelector<HTMLElement>('.msg-search-bar__empty');
        if (emptyEl) {
            emptyEl.textContent = 'К сожалению, сообщение не найдено';
            emptyEl.style.display = 'flex';
        }
    }

    protected beforeUnmount(): void {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.requestId += 1;
        this.inputComponent?.unmount();
        this.closeButton?.unmount();
        this.resultItems.forEach(item => item.unmount());
        this.resultItems = [];
    }
}
