import { BASE_URL } from "../core/utils/apiBase";
import { httpClient } from "../core/utils/httpClient";

export interface CreatePaymentRequest {
    amount: number;
    subscription_days: number;
}

export interface PaymentDto {
    id?: number | string;
    payment_id?: string;
    status?: string;
    payment_url?: string;
    [key: string]: unknown;
}

export type PaymentServiceResult =
    | { success: true; status: number; payment: PaymentDto; paymentUrl?: string }
    | { success: false; status: number; error: string };

class PaymentService {
    public async createPayment(payload: CreatePaymentRequest): Promise<PaymentServiceResult> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/payment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            return await this.toPaymentResult(response);
        } catch (error) {
            return {
                success: false,
                status: 0,
                error: error instanceof Error ? error.message : "Не удалось создать платёж",
            };
        }
    }

    public async syncPayment(): Promise<PaymentServiceResult> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/payment/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            return await this.toPaymentResult(response);
        } catch (error) {
            return {
                success: false,
                status: 0,
                error: error instanceof Error ? error.message : "Не удалось проверить платёж",
            };
        }
    }

    private async toPaymentResult(response: Response): Promise<PaymentServiceResult> {
        const json = await this.readJson(response);

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
                error: this.extractError(json) || `Сервис ответил с кодом ${response.status}`,
            };
        }

        const payment = this.extractPayment(json);
        if (!payment) {
            return {
                success: false,
                status: response.status,
                error: "Некорректный ответ сервиса оплаты",
            };
        }

        const paymentUrl = this.extractPaymentUrl(payment);
        return {
            success: true,
            status: response.status,
            payment,
            ...(paymentUrl ? { paymentUrl } : {}),
        };
    }

    private async readJson(response: Response): Promise<unknown> {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    private extractPayment(raw: unknown): PaymentDto | null {
        if (!this.isRecord(raw)) return null;
        const body = raw.body;
        if (this.isRecord(body)) return body as PaymentDto;
        return raw as PaymentDto;
    }

    private extractPaymentUrl(payment: PaymentDto): string | undefined {
        const direct = payment.payment_url ?? payment.paymentUrl ?? payment.confirmation_url;
        if (typeof direct === "string" && direct.trim()) return direct;

        const confirmation = payment.confirmation;
        if (this.isRecord(confirmation) && typeof confirmation.confirmation_url === "string") {
            return confirmation.confirmation_url;
        }

        return undefined;
    }

    private extractError(raw: unknown): string {
        if (!this.isRecord(raw)) return "";

        if (typeof raw.message === "string") return raw.message;

        if (Array.isArray(raw.errors)) {
            return raw.errors
                .map((error) => this.isRecord(error) && typeof error.message === "string" ? error.message : "")
                .filter(Boolean)
                .join("; ");
        }

        return "";
    }

    private isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
    }
}

export const paymentService = new PaymentService();

