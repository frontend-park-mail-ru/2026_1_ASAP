import { BasePage, IBasePageProps } from "../../core/base/basePage";
import { complaintsAdminService, Complaint, ComplaintStatus } from "../../services/complaintsAdminService";
import { ComplaintItem } from "../../components/composite/complaintItem/complaintItem";
import { ComplaintStatusModal } from "../../components/composite/complaintStatusModal/complaintStatusModal";
import template from "./adminPage.hbs";

interface AdminPageProps extends IBasePageProps {}

export class AdminPage extends BasePage<AdminPageProps> {
    private complaintItems: ComplaintItem[] = [];
    private activeModal: ComplaintStatusModal | null = null;

    constructor(props: AdminPageProps = {}) {
        super(props);
    }

    getTemplate() {
        return template;
    }

    protected async afterMount(): Promise<void> {
        const listContainer = this.element?.querySelector<HTMLElement>('[data-component="admin-complaint-list"]');
        if (!listContainer) return;

        this.showLoading(listContainer);

        try {
            const complaints = await complaintsAdminService.getAllComplaints();
            listContainer.innerHTML = '';
            this.renderComplaints(listContainer, complaints);
        } catch (e) {
            listContainer.innerHTML = '';
            const message = e instanceof Error ? e.message : 'Не удалось загрузить обращения.';
            this.showError(listContainer, message);
        }
    }

    private renderComplaints(container: HTMLElement, complaints: Complaint[]): void {
        if (complaints.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'admin-page__empty';
            empty.textContent = 'Обращений пока нет.';
            container.appendChild(empty);
            return;
        }

        for (const complaint of complaints) {
            const item = new ComplaintItem({
                complaint,
                onClick: (c: Complaint) => this.openModal(c, item),
            });
            item.mount(container);
            this.complaintItems.push(item);
        }
    }

    private openModal(complaint: Complaint, item: ComplaintItem): void {
        if (this.activeModal) {
            this.activeModal.unmount();
            this.activeModal = null;
        }

        const modal = new ComplaintStatusModal({
            complaint,
            onClose: () => {
                modal.unmount();
                this.activeModal = null;
            },
            onSuccess: (newStatus: ComplaintStatus | string) => {
                item.updateStatus(newStatus);
                modal.unmount();
                this.activeModal = null;
            },
        });

        modal.mount(document.body);
        this.activeModal = modal;
    }

    private showLoading(container: HTMLElement): void {
        container.innerHTML = '<p class="admin-page__loading">Загрузка...</p>';
    }

    private showError(container: HTMLElement, message: string): void {
        const el = document.createElement('p');
        el.className = 'admin-page__error';
        el.textContent = message;
        container.appendChild(el);
    }

    protected beforeUnmount(): void {
        this.activeModal?.unmount();
        this.activeModal = null;
        for (const item of this.complaintItems) {
            item.unmount();
        }
        this.complaintItems = [];
    }
}
