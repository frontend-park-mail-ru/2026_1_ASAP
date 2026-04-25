import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { supportService, MyComplaintItem } from "../../../services/supportService";
import template from "./supportMyTab.hbs";

interface SupportMyTabProps extends IBaseComponentProps {}

type StatusFilter = "all" | "new" | "in_progress" | "closed";

export class SupportMyTab extends BaseComponent<SupportMyTabProps> {
    private allComplaints: MyComplaintItem[] = [];
    private currentFilter: StatusFilter = "all";
    private searchQuery: string = "";
    private searchInput: HTMLInputElement | null = null;
    private searchHandler: (() => void) | null = null;
    private filterHandlers: Map<string, () => void> = new Map();

    constructor(props: SupportMyTabProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const searchEl = this.element.querySelector<HTMLInputElement>(".support-my-tab__search-field");
        if (searchEl) {
            this.searchInput = searchEl;
            this.searchHandler = () => {
                this.searchQuery = searchEl.value;
                this.renderList();
            };
            searchEl.addEventListener("input", this.searchHandler);
        }

        const filters: StatusFilter[] = ["all", "new", "in_progress", "closed"];
        for (const f of filters) {
            const btn = this.element.querySelector<HTMLButtonElement>(`[data-filter="${f}"]`);
            if (btn) {
                const handler = () => this.setFilter(f);
                this.filterHandlers.set(f, handler);
                btn.addEventListener("click", handler);
            }
        }

        this.setFilter("all");
        void this.loadComplaints();
    }

    private setFilter(status: StatusFilter): void {
        this.currentFilter = status;
        this.element?.querySelectorAll<HTMLButtonElement>(".support-my-tab__filter-btn").forEach(btn => {
            btn.classList.toggle("support-my-tab__filter-btn--active", btn.dataset.filter === status);
        });
        this.renderList();
    }

    private async loadComplaints(): Promise<void> {
        const listEl = this.element?.querySelector(".support-my-tab__list");
        if (listEl) listEl.innerHTML = '<p class="support-my-tab__state-msg">Загрузка...</p>';

        const result = await supportService.getMyComplaints();
        if (result.success === false) {
            const msg = result.error;
            if (listEl) listEl.innerHTML = `<p class="support-my-tab__state-msg support-my-tab__state-msg--error">Ошибка: ${msg}</p>`;
            return;
        }

        this.allComplaints = result.complaints;
        this.updateFilterCounts();
        this.renderList();
    }

    private getFiltered(): MyComplaintItem[] {
        return this.allComplaints.filter(c => {
            const matchesFilter = this.currentFilter === "all" || c.status === this.currentFilter;
            const matchesSearch = !this.searchQuery || c.body.toLowerCase().includes(this.searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }

    private updateFilterCounts(): void {
        const counts: Record<StatusFilter, number> = {
            all: this.allComplaints.length,
            new: this.allComplaints.filter(c => c.status === "new").length,
            in_progress: this.allComplaints.filter(c => c.status === "in_progress").length,
            closed: this.allComplaints.filter(c => c.status === "closed").length
        };

        const filters: StatusFilter[] = ["all", "new", "in_progress", "closed"];
        for (const f of filters) {
            const btn = this.element?.querySelector<HTMLButtonElement>(`[data-filter="${f}"]`);
            const countEl = btn?.querySelector(".support-my-tab__filter-count");
            if (countEl) countEl.textContent = String(counts[f]);
        }
    }

    private renderList(): void {
        const listEl = this.element?.querySelector(".support-my-tab__list");
        if (!listEl) return;

        const filtered = this.getFiltered();
        if (!filtered.length) {
            listEl.innerHTML = '<p class="support-my-tab__state-msg">Обращений не найдено</p>';
            return;
        }

        listEl.innerHTML = filtered.map(c => this.renderCard(c)).join("");
    }

    private statusLabel(status: string): string {
        switch (status) {
            case "new": return "Открыто";
            case "in_progress": return "В работе";
            case "closed": return "Закрыто";
            default: return status;
        }
    }

    private statusClass(status: string): string {
        switch (status) {
            case "new": return "new";
            case "in_progress": return "in_progress";
            case "closed": return "closed";
            default: return "new";
        }
    }

    private typeLabel(type: string): string {
        switch (type) {
            case "bug": return "Баг";
            case "suggestion": return "Предложение";
            case "complaint": return "Жалоба";
            default: return type;
        }
    }

    private formatTime(isoDate: string): string {
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return "";
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60_000);
        if (diffMins < 1) return "только что";
        if (diffMins < 60) return `${diffMins} мин. назад`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} ч. назад`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} д. назад`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    private renderCard(c: MyComplaintItem): string {
        return `
        <div class="support-my-tab__card">
            <div class="support-my-tab__card-row">
                <span class="support-my-tab__card-meta">#${c.id} · ${this.typeLabel(c.type)}</span>
                <span class="support-my-tab__status-badge support-my-tab__status-badge--${this.statusClass(c.status)}">${this.statusLabel(c.status)}</span>
            </div>
            <p class="support-my-tab__card-body">${this.escapeHtml(c.body)}</p>
            <div class="support-my-tab__card-footer">
                <span class="support-my-tab__card-time">обновлено ${this.formatTime(c.updated_at)}</span>
            </div>
        </div>`;
    }

    protected beforeUnmount(): void {
        if (this.searchInput && this.searchHandler) {
            this.searchInput.removeEventListener("input", this.searchHandler);
        }
        const filters: StatusFilter[] = ["all", "new", "in_progress", "closed"];
        for (const f of filters) {
            const btn = this.element?.querySelector<HTMLButtonElement>(`[data-filter="${f}"]`);
            const handler = this.filterHandlers.get(f);
            if (btn && handler) btn.removeEventListener("click", handler);
        }
        this.filterHandlers.clear();
        this.searchInput = null;
        this.searchHandler = null;
    }
}
