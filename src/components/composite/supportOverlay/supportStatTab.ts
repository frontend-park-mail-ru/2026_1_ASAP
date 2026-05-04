import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { supportService, ComplaintAnalytics } from "../../../services/supportService";
import template from "./supportStatTab.hbs";

interface SupportStatTabProps extends IBaseComponentProps {}

export class SupportStatTab extends BaseComponent<SupportStatTabProps> {
    private isMounted = false;

    constructor(props: SupportStatTabProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        this.isMounted = true;
        void this.loadStatistics();
    }

    private async loadStatistics(): Promise<void> {
        const barsEl = this.element?.querySelector<HTMLElement>('[data-component="status-bars"]');
        const typeBarsEl = this.element?.querySelector<HTMLElement>('[data-component="type-bars"]');
        const loading = '<p class="support-stat-tab__state-msg">Загрузка...</p>';
        if (barsEl) barsEl.innerHTML = loading;
        if (typeBarsEl) typeBarsEl.innerHTML = loading;

        const result = await supportService.getStatistics();
        if (!this.isMounted) return;

        if (result.success === false) {
            const msg = this.escapeHtml(result.error);
            const error = `<p class="support-stat-tab__state-msg support-stat-tab__state-msg--error">Ошибка: ${msg}</p>`;
            if (barsEl) barsEl.innerHTML = error;
            if (typeBarsEl) typeBarsEl.innerHTML = error;
            return;
        }

        this.renderStatistics(result.statistics);
    }

    private renderStatistics(stats: ComplaintAnalytics): void {
        const { count_status_opened, count_status_in_work, count_status_closed } = stats.count_status;
        const { count_type_bug, count_type_upgrade, count_type_product } = stats.count_type;
        const totalByStatus = count_status_opened + count_status_in_work + count_status_closed;
        const totalByType = count_type_bug + count_type_upgrade + count_type_product;
        const total = Math.max(totalByStatus, totalByType);

        const totalEl = this.element?.querySelector('[data-stat="total"]');
        if (totalEl) totalEl.textContent = String(total);

        const barsEl = this.element?.querySelector<HTMLElement>('[data-component="status-bars"]');
        const typeBarsEl = this.element?.querySelector<HTMLElement>('[data-component="type-bars"]');

        if (barsEl) {
            barsEl.innerHTML = this.renderGroupBars([
                { mod: "new", label: "Открыто", count: count_status_opened },
                { mod: "in_progress", label: "В работе", count: count_status_in_work },
                { mod: "closed", label: "Закрыто", count: count_status_closed }
            ]);
        }
        if (typeBarsEl) {
            typeBarsEl.innerHTML = this.renderGroupBars([
                { mod: "bug", label: "Баги", count: count_type_bug },
                { mod: "suggestion", label: "Предложения", count: count_type_upgrade },
                { mod: "complaint", label: "Жалобы", count: count_type_product }
            ]);
        }
    }

    private pct(count: number, total: number): string {
        if (total === 0) return "0%";
        return `${Math.round((count / total) * 100)}%`;
    }

    private renderGroupBars(items: { mod: string; label: string; count: number }[]): string {
        const total = items.reduce((sum, item) => sum + item.count, 0);
        if (total === 0) {
            return '<p class="support-stat-tab__state-msg">Данных пока нет</p>';
        }

        return `
        <div class="support-stat-tab__track">
            ${items.map(item => this.renderTrackSegment(item.mod, item.count, total)).join("")}
        </div>
        <div class="support-stat-tab__bar-rows">
            ${items.map(item => this.renderBarRow(item.mod, item.label, item.count, total)).join("")}
        </div>`;
    }

    private renderTrackSegment(mod: string, count: number, total: number): string {
        return `<div class="support-stat-tab__track-segment support-stat-tab__track-segment--${mod}" style="width:${this.pct(count, total)}"></div>`;
    }

    private renderBarRow(mod: string, label: string, count: number, total: number): string {
        return `
        <div class="support-stat-tab__bar-row">
            <span class="support-stat-tab__bar-dot support-stat-tab__bar-dot--${mod}"></span>
            <span class="support-stat-tab__bar-label">${label}</span>
            <div class="support-stat-tab__bar-fill-wrap">
                <div class="support-stat-tab__bar-fill support-stat-tab__bar-fill--${mod}" style="width:${this.pct(count, total)}"></div>
            </div>
            <span class="support-stat-tab__bar-count">${count}</span>
        </div>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    protected beforeUnmount(): void {
        this.isMounted = false;
    }
}
