import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Complaint, ComplaintStatus } from "../../../services/complaintsAdminService";
import template from "./complaintItem.hbs";

interface ComplaintItemProps extends IBaseComponentProps {
    complaint: Complaint;
    onClick: (complaint: Complaint) => void;
}

export function statusToLabel(status: ComplaintStatus | string): string {
    switch (status) {
        case 'new': return 'Новое';
        case 'in_progress': return 'В работе';
        case 'closed': return 'Закрыто';
        default: return status;
    }
}

export function statusToClass(status: ComplaintStatus | string): string {
    switch (status) {
        case 'new': return 'new';
        case 'in_progress': return 'in_progress';
        case 'closed': return 'closed';
        default: return 'new';
    }
}

function typeToLabel(type: string): string {
    switch (type) {
        case 'bug': return 'Баг';
        case 'idea': return 'Идея';
        case 'claim': return 'Жалоба';
        case 'suggestion': return 'Предложение';
        default: return type;
    }
}

function getAuthorDisplay(complaint: Complaint): string {
    const name = complaint.feedback?.feedback_name;
    const email = complaint.feedback?.feedback_email;
    if (name && email) return `${name} (${email})`;
    if (name) return name;
    if (email) return email;
    if (complaint.user_id) return `User #${complaint.user_id}`;
    return 'Аноним';
}

function formatRelativeTime(isoDate: string): string {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} д. назад`;
}

export class ComplaintItem extends BaseComponent<ComplaintItemProps> {
    constructor(props: ComplaintItemProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const { complaint } = this.props;

        const typeEl = this.element.querySelector('[data-component="ci-type"]');
        if (typeEl) typeEl.textContent = typeToLabel(complaint.type);

        const authorEl = this.element.querySelector('[data-component="ci-author"]');
        if (authorEl) authorEl.textContent = getAuthorDisplay(complaint);

        this.renderStatusBadge(complaint.status);

        const bodyEl = this.element.querySelector('[data-component="ci-body"]');
        if (bodyEl) bodyEl.textContent = complaint.body;

        const timeEl = this.element.querySelector('[data-component="ci-time"]');
        if (timeEl) timeEl.textContent = `обновлено ${formatRelativeTime(complaint.updated_at)}`;

        this.element.addEventListener('click', this.handleClick);
    }

    private renderStatusBadge(status: ComplaintStatus | string): void {
        const badge = this.element?.querySelector('[data-component="ci-status-badge"]');
        if (!badge) return;
        badge.className = `complaint-status-badge complaint-status-badge--${statusToClass(status)}`;
        badge.textContent = statusToLabel(status);
    }

    public updateStatus(newStatus: ComplaintStatus | string): void {
        this.props.complaint.status = newStatus;
        this.renderStatusBadge(newStatus);
    }

    private handleClick = (): void => {
        this.props.onClick(this.props.complaint);
    };

    protected beforeUnmount(): void {
        this.element?.removeEventListener('click', this.handleClick);
    }
}
