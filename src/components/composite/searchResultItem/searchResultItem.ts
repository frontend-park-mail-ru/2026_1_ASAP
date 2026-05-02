import { BaseComponent, IBaseComponentProps } from '../../../core/base/baseComponent';
import { Avatar } from '../../ui/avatar/avatar';
import { chatService } from '../../../services/chatService';
import { SearchMessageHit } from '../../../types/search';
import template from './searchResultItem.hbs';
import './searchResultItem.scss';

interface SearchResultItemProps extends IBaseComponentProps {
    hit: SearchMessageHit;
    query: string;
    isSelected: boolean;
    onClick?: () => void;
}

export class SearchResultItem extends BaseComponent<SearchResultItemProps> {
    private avatarComponent: Avatar | null = null;

    constructor(props: SearchResultItemProps) {
        const now = new Date();
        const d = props.hit.createdAt;
        const isToday =
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate();
        const formattedTime = isToday
            ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', hour12: false })
            : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

        super({ ...props, formattedTime });
    }

    getTemplate() {
        return template;
    }

    public getMessageId(): string {
        return this.props.hit.messageId;
    }

    public setSelected(selected: boolean): void {
        if (!this.element) return;
        this.element.classList.toggle('search-result-item--selected', selected);
    }

    protected afterMount(): void {
        if (!this.element) return;

        this.element.addEventListener('click', () => this.props.onClick?.());

        const avatarSlot = this.element.querySelector('[data-component="sri-avatar-slot"]');
        if (avatarSlot) {
            this.avatarComponent = new Avatar({
                src: '/assets/images/avatars/defaultAvatar.svg',
                class: 'search-result-item__avatar-img',
            });
            this.avatarComponent.mount(avatarSlot as HTMLElement);
        }

        this.renderPreview();
        this.loadAuthor();
    }

    private renderPreview(): void {
        const previewEl = this.element?.querySelector('.search-result-item__preview');
        if (!previewEl) return;
        this.applyHighlight(previewEl as HTMLElement, this.props.hit.textPreview, this.props.query);
    }

    private applyHighlight(container: HTMLElement, text: string, query: string): void {
        container.textContent = '';
        if (!query) {
            container.textContent = text;
            return;
        }

        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const parts = text.split(regex);

        parts.forEach(part => {
            if (regex.test(part)) {
                const mark = document.createElement('span');
                mark.className = 'search-highlight';
                mark.textContent = part;
                container.appendChild(mark);
            } else {
                container.appendChild(document.createTextNode(part));
            }
            regex.lastIndex = 0;
        });
    }

    private async loadAuthor(): Promise<void> {
        const nameEl = this.element?.querySelector('.search-result-item__name');
        if (!nameEl) return;

        nameEl.textContent = `User #${this.props.hit.senderId}`;

        const user = await chatService.getUserProfile(this.props.hit.senderId);
        if (!this.element || !user) return;

        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.login;
        nameEl.textContent = name;

        if (user.avatarUrl && this.avatarComponent) {
            const img = this.avatarComponent.element?.tagName === 'IMG'
                ? this.avatarComponent.element as HTMLImageElement
                : this.avatarComponent.element?.querySelector('img');
            if (img) img.src = user.avatarUrl;
        }
    }

    protected beforeUnmount(): void {
        this.avatarComponent?.unmount();
    }
}
