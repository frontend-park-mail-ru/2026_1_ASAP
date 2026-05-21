import { BASE_URL } from "../core/utils/apiBase";
import { httpClient } from "../core/utils/httpClient";

export interface SubscriptionDto {
    user_id?: number;
    active: boolean;
    start_at?: string;
    end_at?: string;
}

export type SubscriptionServiceResult =
    | { success: true; status: number; subscription: SubscriptionDto | null }
    | { success: false; status: number; error: string };

class SubscriptionService {
    public async getSubscription(): Promise<SubscriptionServiceResult> {
        try {
            const response = await httpClient.request(`${BASE_URL}/api/v1/subscription`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            return await this.toSubscriptionResult(response);
        } catch (error) {
            return {
                success: false,
                status: 0,
                error: error instanceof Error ? error.message : "Не удалось получить статус подписки",
            };
        }
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
        const candidate = this.isRecord(body) ? body : raw;
        const active = this.pickBoolean(candidate, "active", "Active");
        if (active === null) return null;

        return {
            active,
            ...this.optionalNumber(candidate, "user_id", "UserID", "userId"),
            ...this.optionalString(candidate, "start_at", "StartAt", "startAt"),
            ...this.optionalString(candidate, "end_at", "EndAt", "endAt"),
        };
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

    private pickBoolean(source: Record<string, unknown>, ...keys: string[]): boolean | null {
        for (const key of keys) {
            if (typeof source[key] === "boolean") {
                return source[key];
            }
        }
        return null;
    }

    private optionalNumber(source: Record<string, unknown>, ...keys: string[]): Pick<SubscriptionDto, "user_id"> {
        for (const key of keys) {
            if (typeof source[key] === "number") {
                return { user_id: source[key] };
            }
        }
        return {};
    }

    private optionalString(
        source: Record<string, unknown>,
        canonicalKey: "start_at" | "end_at",
        ...keys: string[]
    ): Pick<SubscriptionDto, "start_at" | "end_at"> {
        for (const key of [canonicalKey, ...keys]) {
            if (typeof source[key] === "string") {
                return { [canonicalKey]: source[key] };
            }
        }
        return {};
    }
}

export const subscriptionService = new SubscriptionService();
