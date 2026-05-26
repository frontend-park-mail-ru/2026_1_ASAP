import { BASE_URL } from "../core/utils/apiBase";
import { httpClient } from "../core/utils/httpClient";

export interface SubscriptionDto {
    user_id?: number;
    active: boolean;
    start_at?: string;
    end_at?: string;
}

interface SubscriptionApiBody {
    UserID?: number;
    Active: boolean;
    StartAt?: string;
    EndAt?: string;
}

export type SubscriptionServiceResult =
    | { success: true; status: number; subscription: SubscriptionDto | null }
    | { success: false; status: number; error: string };

class SubscriptionService {
    private premiumCache: boolean | null = null;
    private premiumPrimePromise: Promise<boolean> | null = null;

    public async getSubscription(): Promise<SubscriptionServiceResult> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/subscription`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const result = await this.toSubscriptionResult(response);
            if (result.success) {
                this.premiumCache = result.subscription?.active ?? false;
            }
            return result;
        } catch (error) {
            return {
                success: false,
                status: 0,
                error: error instanceof Error ? error.message : "Не удалось получить статус подписки",
            };
        }
    }

    public isPremiumCached(): boolean {
        return this.premiumCache === true;
    }

    /**
     * Прогревает кэш статуса подписки. Идемпотентно: повторные вызовы
     * во время уже идущего запроса не плодят новых, а ждут общий промис.
     */
    public async primePremium(): Promise<boolean> {
        if (this.premiumCache !== null) return this.premiumCache;
        if (this.premiumPrimePromise) return this.premiumPrimePromise;

        this.premiumPrimePromise = (async () => {
            const res = await this.getSubscription();
            const active = res.success ? (res.subscription?.active ?? false) : false;
            this.premiumCache = active;
            return active;
        })();
        try {
            return await this.premiumPrimePromise;
        } finally {
            this.premiumPrimePromise = null;
        }
    }

    /** Сбросить кэш после оплаты/отмены подписки. */
    public invalidatePremiumCache(): void {
        this.premiumCache = null;
    }

    private async toSubscriptionResult(response: Response): Promise<SubscriptionServiceResult> {
        const json = await this.readJson(response);

        if (!response.ok) {
            if (response.status === 404 && this.isSubscriptionNotFound(json)) {
                return {
                    success: true,
                    status: response.status,
                    subscription: null,
                };
            }

            return {
                success: false,
                status: response.status,
                error: this.extractError(json) || `Сервис ответил с кодом ${response.status}`,
            };
        }

        const subscription = this.extractSubscription(json);
        if (!subscription) {
            return {
                success: false,
                status: response.status,
                error: "Некорректный ответ сервиса подписки",
            };
        }

        return {
            success: true,
            status: response.status,
            subscription,
        };
    }

    private async readJson(response: Response): Promise<unknown> {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }

    private extractSubscription(raw: unknown): SubscriptionDto | null {
        if (!this.isRecord(raw)) return null;
        const body = raw.body;
        if (!this.isSubscriptionApiBody(body)) return null;

        return this.mapSubscription(body);
    }

    private isSubscriptionNotFound(raw: unknown): boolean {
        if (!this.isRecord(raw)) return false;

        if (typeof raw.message === "string" && raw.message === "Subscription not found") {
            return true;
        }

        if (!Array.isArray(raw.errors)) return false;

        return raw.errors.some((error) => {
            if (!this.isRecord(error)) return false;
            return (
                error.code === "SUBCRIPTION_NOT_FOUND" ||
                error.code === "SUBSCRIPTION_NOT_FOUND" ||
                error.message === "Subscription not found"
            );
        });
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

    private isSubscriptionApiBody(value: unknown): value is SubscriptionApiBody {
        if (!this.isRecord(value)) return false;
        return typeof value.Active === "boolean";
    }

    private mapSubscription(body: SubscriptionApiBody): SubscriptionDto {
        return {
            active: body.Active,
            ...(typeof body.UserID === "number" ? { user_id: body.UserID } : {}),
            ...(typeof body.StartAt === "string" ? { start_at: body.StartAt } : {}),
            ...(typeof body.EndAt === "string" ? { end_at: body.EndAt } : {}),
        };
    }
}

export const subscriptionService = new SubscriptionService();
