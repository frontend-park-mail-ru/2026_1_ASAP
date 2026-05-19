import { BaseComponent, IBaseComponentProps } from "../../../core/base/baseComponent";
import { paymentService, PaymentDto } from "../../../services/paymentService";
import { Button } from "../../ui/button/button";
import { ProfileHeader } from "../profileHeader/profileHeader";
import template from "./subscriptionWindow.hbs";

interface SubscriptionWindowProps extends IBaseComponentProps {
    closeWindow: (event: MouseEvent) => void;
}

type SubscriptionStatusKind = "idle" | "loading" | "success" | "error" | "pending";

const SUBSCRIPTION_TARIFF = {
    amount: 199,
    subscription_days: 30,
    priceLabel: "199 ₽",
    periodLabel: "30 дней",
};

export class SubscriptionWindow extends BaseComponent<SubscriptionWindowProps> {
    private profileHeader: ProfileHeader | null = null;
    private payButton: Button | null = null;
    private syncButton: Button | null = null;
    private statusElement: HTMLElement | null = null;
    private actionsElement: HTMLElement | null = null;
    private isProcessing = false;

    constructor(props: SubscriptionWindowProps) {
        super({
            ...props,
            priceLabel: SUBSCRIPTION_TARIFF.priceLabel,
            periodLabel: SUBSCRIPTION_TARIFF.periodLabel,
        });
    }

    getTemplate() {
        return template;
    }

    protected afterMount(): void {
        this.profileHeader = new ProfileHeader({
            closeWindow: this.props.closeWindow,
            label: "Подписка",
        });
        this.profileHeader.mount(this.element!);
        if (this.profileHeader.element) {
            this.element!.prepend(this.profileHeader.element);
        }

        this.statusElement = this.element!.querySelector('[data-component="subscription-status"]');
        this.actionsElement = this.element!.querySelector('[data-component="subscription-actions"]');

        this.mountActions();
        this.setStatus("idle", "Выберите оплату, чтобы перейти на страницу ЮKassa.");

        if (this.shouldSyncAfterReturn()) {
            void this.syncPayment(true);
        }
    }

    private mountActions(): void {
        if (!this.actionsElement) return;
        this.actionsElement.innerHTML = "";

        this.payButton = new Button({
            label: "Оплатить подписку",
            class: "ui-button ui-button__primary subscription-window__button",
            onClick: () => {
                void this.createPayment();
            },
        });
        this.payButton.mount(this.actionsElement);

        this.syncButton = new Button({
            label: "Проверить оплату",
            class: "ui-button ui-button__secondary subscription-window__button",
            onClick: () => {
                void this.syncPayment(false);
            },
        });
        this.syncButton.mount(this.actionsElement);
    }

    private async createPayment(): Promise<void> {
        if (this.isProcessing) return;

        this.setProcessing(true);
        this.setStatus("loading", "Создаём платёж...");

        const result = await paymentService.createPayment({
            amount: SUBSCRIPTION_TARIFF.amount,
            subscription_days: SUBSCRIPTION_TARIFF.subscription_days,
        });

        if (result.success === false) {
            this.setStatus("error", result.error);
            this.setProcessing(false);
            return;
        }

        if (!result.paymentUrl) {
            this.setStatus("error", "Сервис оплаты не вернул ссылку на ЮKassa.");
            this.setProcessing(false);
            return;
        }

        window.location.assign(result.paymentUrl);
    }

    private async syncPayment(fromReturnUrl: boolean): Promise<void> {
        if (this.isProcessing) return;

        this.setProcessing(true);
        this.setStatus("loading", "Проверяем статус платежа...");

        const result = await paymentService.syncPayment();

        if (fromReturnUrl) {
            this.clearReturnQuery();
        }

        if (result.success === false) {
            this.setStatus("error", result.error);
            this.setProcessing(false);
            return;
        }

        this.setStatusByPayment(result.payment);
        this.setProcessing(false);
    }

    private setStatusByPayment(payment: PaymentDto): void {
        const status = typeof payment.status === "string" ? payment.status : "";

        if (status === "succeeded") {
            this.setStatus("success", "Подписка активирована.");
            return;
        }

        if (status === "pending" || status === "waiting_for_capture") {
            this.setStatus("pending", "Платёж пока не подтверждён.");
            return;
        }

        if (status === "canceled" || status === "failed") {
            this.setStatus("error", "Платёж отменён или не прошёл.");
            return;
        }

        this.setStatus("pending", status ? `Текущий статус платежа: ${status}` : "Статус платежа пока неизвестен.");
    }

    private setStatus(kind: SubscriptionStatusKind, message: string): void {
        if (!this.statusElement) return;
        this.statusElement.className = `subscription-window__status subscription-window__status--${kind}`;
        this.statusElement.textContent = message;
    }

    private setProcessing(value: boolean): void {
        this.isProcessing = value;
        this.payButton?.element?.classList.toggle("ui-button__disabled", value);
        this.syncButton?.element?.classList.toggle("ui-button__disabled", value);
        this.payButton!.disabled = value;
        this.syncButton!.disabled = value;
    }

    private shouldSyncAfterReturn(): boolean {
        const params = new URLSearchParams(window.location.search);
        return (
            params.has("payment_return") ||
            params.has("paymentReturn") ||
            params.has("payment_id") ||
            params.has("paymentId")
        );
    }

    private clearReturnQuery(): void {
        const url = new URL(window.location.href);
        ["payment_return", "paymentReturn", "payment_id", "paymentId"].forEach((key) => {
            url.searchParams.delete(key);
        });
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }

    protected beforeUnmount(): void {
        this.payButton?.unmount();
        this.syncButton?.unmount();
        this.profileHeader?.unmount();
    }
}
