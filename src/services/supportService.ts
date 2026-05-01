import { httpClient } from "../core/utils/httpClient";
import { authService } from "./authService";

import { BASE_URL } from '../core/utils/apiBase';

export type ComplaintType = "bug" | "suggestion" | "complaint";

export interface CreateComplaintPayload {
    type: ComplaintType;
    feedbackName: string;
    feedbackEmail: string;
    body: string;
    file?: File | null;
}

export type CreateComplaintResult =
    | { success: true; data: unknown }
    | { success: false; error: string; status: number };

export interface MyComplaintFeedback {
    feedback_name: string;
    feedback_email: string;
}

export interface MyComplaintItem {
    id: number;
    type: ComplaintType;
    status: string;
    feedback: MyComplaintFeedback;
    body: string;
    user_id: number;
    attachment_url?: string;
    created_at: string;
    updated_at: string;
}

export type GetMyComplaintsResult =
    | { success: true; complaints: MyComplaintItem[] }
    | { success: false; error: string; status: number };

/** Ответ /api/v1/analytics/complaint — поле body */
export interface ComplaintAnalyticsStatus {
    count_status_opened: number;
    count_status_in_work: number;
    count_status_closed: number;
}

export interface ComplaintAnalyticsType {
    count_type_bug: number;
    count_type_upgrade: number;
    count_type_product: number;
}

export interface ComplaintAnalytics {
    count_status: ComplaintAnalyticsStatus;
    count_type: ComplaintAnalyticsType;
}

export type GetComplaintStatisticsResult =
    | { success: true; statistics: ComplaintAnalytics }
    | { success: false; error: string; status: number };

class SupportService {
    private readCount(source: Record<string, unknown> | undefined, ...keys: string[]): number {
        if (!source) return 0;
        for (const key of keys) {
            const value = source[key];
            if (typeof value === "number" && Number.isFinite(value)) {
                return value;
            }
            if (typeof value === "string" && value.trim() !== "") {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
        }
        return 0;
    }

    private normalizeStatistics(body: unknown): ComplaintAnalytics | null {
        if (!body || typeof body !== "object") return null;

        const raw = body as {
            count_status?: Record<string, unknown>;
            count_type?: Record<string, unknown>;
        };
        if (!raw.count_status || !raw.count_type) return null;

        return {
            count_status: {
                count_status_opened: this.readCount(raw.count_status, "count_status_opened", "count_status_new"),
                count_status_in_work: this.readCount(raw.count_status, "count_status_in_work", "count_status_in_progress"),
                count_status_closed: this.readCount(raw.count_status, "count_status_closed")
            },
            count_type: {
                count_type_bug: this.readCount(raw.count_type, "count_type_bug"),
                count_type_upgrade: this.readCount(raw.count_type, "count_type_upgrade", "count_type_suggestion", "count_type_idea"),
                count_type_product: this.readCount(raw.count_type, "count_type_product", "count_type_complaint", "count_type_claim")
            }
        };
    }

    public async createComplaint(payload: CreateComplaintPayload): Promise<CreateComplaintResult> {
        const isAuthed = await authService.checkAuth();
        const url = isAuthed
            ? `${BASE_URL}/api/v1/complaints/create`
            : `${BASE_URL}/api/v1/complaints/createUnauthorized`;

        const formData = new FormData();
        const jsonBody = {
            type: payload.type,
            feedback: {
                feedback_name: payload.feedbackName.trim(),
                feedback_email: payload.feedbackEmail.trim()
            },
            body: payload.body
        };
        formData.append("payload", JSON.stringify(jsonBody));
        if (payload.file) {
            formData.append("attachment", payload.file);
        }

        try {
            const response = await httpClient.request(url, {
                method: "POST",
                body: formData,
                credentials: isAuthed ? "include" : "omit",
                ignoreUnauthorized: true
            });

            if (!response.ok) {
                let errorMessage = `Сервис ответил с кодом ${response.status}`;

                try {
                    const errData = (await response.json()) as {
                        errors?: { message?: string }[];
                        message?: string;
                    };
                    if (errData.errors && Array.isArray(errData.errors)) {
                        errorMessage = errData.errors.map((e) => e.message).filter(Boolean).join("; ");
                    } else if (errData.message) {
                        errorMessage = errData.message;
                    }
                } catch {
                    console.error("Тело не является json");
                }
                return { success: false, error: errorMessage, status: response.status };
            }

            const data = (await response.json()) as { status?: string; body?: unknown };
            if (data && typeof data === "object" && "body" in data && data.body !== undefined) {
                return { success: true, data: data.body };
            }
            return { success: true, data };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Сеть недоступна. Повторите попытку.";
            return { success: false, error: message, status: 0 };
        }
    }

    public async getMyComplaints(): Promise<GetMyComplaintsResult> {
        const url = `${BASE_URL}/api/v1/complaints/my`;
        try {
            const response = await httpClient.request(url, { method: "GET" });
            if (!response.ok) {
                let errorMessage = `Status ${response.status}`;
                try {
                    const errData = (await response.json()) as { message?: string; errors?: { message?: string }[] };
                    if (errData.errors && Array.isArray(errData.errors)) {
                        errorMessage = errData.errors.map((e) => e.message).filter(Boolean).join("; ");
                    } else if (errData.message) {
                        errorMessage = errData.message;
                    }
                } catch {
                    console.error("Не удалось получить данные об обращениях");
                }
                return { success: false, error: errorMessage, status: response.status };
            }
            const data = (await response.json()) as { body?: MyComplaintItem[] };
            const raw = data?.body;
            const complaints = Array.isArray(raw) ? raw : [];
            return { success: true, complaints };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "unvailable";
            return { success: false, error: message, status: 500 };
        }
    }

    public async getStatistics(): Promise<GetComplaintStatisticsResult> {
        const url = `${BASE_URL}/api/v1/analytics/complaint`;
        try {
            const response = await httpClient.request(url, { method: "GET" });
            if (!response.ok) {
                let errorMessage = `Status ${response.status}`;
                try {
                    const errData = (await response.json()) as { message?: string; errors?: { message?: string }[] };
                    if (errData.errors && Array.isArray(errData.errors)) {
                        errorMessage = errData.errors.map((e) => e.message).filter(Boolean).join("; ");
                    } else if (errData.message) {
                        errorMessage = errData.message;
                    }
                } catch {
                    console.error("Не удалось получить данные о статистике");
                }
                return { success: false, error: errorMessage, status: response.status };
            }
            const data = (await response.json()) as { body?: unknown; status?: string };
            const statistics = this.normalizeStatistics(data?.body);
            if (!statistics) {
                return { success: false, error: "Некорректный ответ сервера", status: response.status };
            }
            return { success: true, statistics };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "unvailable";
            return { success: false, error: message, status: 500 };
        }
    }
}

export const supportService = new SupportService();
