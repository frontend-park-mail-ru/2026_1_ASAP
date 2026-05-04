import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { Button } from "../../ui/button/button";
import { Complaint, ComplaintStatus, complaintsAdminService } from "../../../services/complaintsAdminService";
import { statusToLabel, statusToClass } from "../complaintItem/complaintItem";
import template from "./complaintStatusModal.hbs";

interface ComplaintStatusModalProps extends IBaseComponentProps {
    complaint: Complaint;
    onClose: () => void;
    onSuccess: (newStatus: ComplaintStatus | string) => void;
}

const STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
    { value: 'new', label: 'Новое' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'closed', label: 'Закрыто' },
];

export class ComplaintStatusModal extends BaseComponent<ComplaintStatusModalProps> {
    private isUpdating = false;
    private statusButtons: HTMLButtonElement[] = [];
    private closeButton: Button | null = null;

    constructor(props: ComplaintStatusModalProps) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        if (!this.element) return;

        const overlay = this.element.querySelector('[data-component="csm-overlay"]');
        overlay?.addEventListener('click', () => this.props.onClose());

        document.addEventListener('keydown', this.handleKeyDown);

        const container = this.element.querySelector('[data-component="csm-container"]');
        if (container) {
            this.closeButton = new Button({
                icon: "/assets/images/icons/deleteIcon.svg",
                class: "complaint-status-modal__close-btn",
                onClick: () => this.props.onClose(),
            });
            this.closeButton.mount(container as HTMLElement);
        }

        this.renderMeta();
        this.renderBody();
        this.renderCurrentStatus();
        this.renderStatusButtons();
    }

    private renderMeta(): void {
        const metaEl = this.element?.querySelector('[data-component="csm-meta"]');
        if (!metaEl) return;
        const { feedback, user_id } = this.props.complaint;
        const name = feedback?.feedback_name ?? '';
        const email = feedback?.feedback_email ?? '';

        if (name) {
            const row = document.createElement('div');
            row.className = 'complaint-status-modal__meta-item';
            row.innerHTML = `Имя: <span>${name}</span>`;
            metaEl.appendChild(row);
        }
        if (email) {
            const row = document.createElement('div');
            row.className = 'complaint-status-modal__meta-item';
            row.innerHTML = `Email: <span>${email}</span>`;
            metaEl.appendChild(row);
        }
        if (user_id) {
            const row = document.createElement('div');
            row.className = 'complaint-status-modal__meta-item';
            row.innerHTML = `ID пользователя: <span>${user_id}</span>`;
            metaEl.appendChild(row);
        }
    }

    private renderBody(): void {
        const bodyEl = this.element?.querySelector('[data-component="csm-body"]');
        if (bodyEl) bodyEl.textContent = this.props.complaint.body;
    }

    private renderCurrentStatus(): void {
        const statusEl = this.element?.querySelector('[data-component="csm-current-status"]');
        if (!statusEl) return;
        const { status } = this.props.complaint;
        statusEl.className = `complaint-status-badge complaint-status-badge--${statusToClass(status)}`;
        statusEl.textContent = statusToLabel(status);
    }

    private renderStatusButtons(): void {
        const container = this.element?.querySelector('[data-component="csm-status-buttons"]');
        if (!container) return;

        for (const option of STATUS_OPTIONS) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = option.label;
            btn.className = 'complaint-status-modal__status-btn';
            if (option.value === this.props.complaint.status) {
                btn.classList.add('complaint-status-modal__status-btn--active');
            }
            btn.addEventListener('click', () => this.handleStatusClick(option.value));
            container.appendChild(btn);
            this.statusButtons.push(btn);
        }
    }

    private async handleStatusClick(status: ComplaintStatus): Promise<void> {
        if (this.isUpdating) return;

        const { complaint } = this.props;

        // ID отсутствует — нельзя отправить запрос
        if (complaint.id === undefined || complaint.id === null) {
            this.showError('Не удалось обновить статус: идентификатор обращения отсутствует.');
            return;
        }

        this.setUpdating(true);
        this.clearError();

        try {
            await complaintsAdminService.updateStatus(complaint.id, status);
            this.props.onSuccess(status);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Не удалось обновить статус.';
            this.showError(message);
            this.setUpdating(false);
        }
    }

    private setUpdating(updating: boolean): void {
        this.isUpdating = updating;
        for (const btn of this.statusButtons) {
            btn.disabled = updating;
        }
    }

    private showError(message: string): void {
        const errorEl = this.element?.querySelector('[data-component="csm-error"]');
        if (errorEl) {
            errorEl.textContent = message;
            (errorEl as HTMLElement).style.display = 'block';
        }
    }

    private clearError(): void {
        const errorEl = this.element?.querySelector('[data-component="csm-error"]');
        if (errorEl) {
            errorEl.textContent = '';
            (errorEl as HTMLElement).style.display = 'none';
        }
    }

    private handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') this.props.onClose();
    };

    protected beforeUnmount(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.closeButton?.unmount();
        this.statusButtons = [];
    }
}
