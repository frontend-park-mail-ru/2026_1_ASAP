import { httpClient } from "../core/utils/httpClient";
import { authService } from "./authService";

const host = window.location.hostname;
const BASE_URL = `${window.location.protocol}//${host}`;

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

class SupportService {
    public async createComplaint(payload: CreateComplaintPayload): Promise<CreateComplaintResult> {
        const isAuthed = await authService.checkAuth();
        const url = isAuthed
            ? `${BASE_URL}/api/v1/complaints/create`
            : `${BASE_URL}/api/v1/complaints/createUnauthorized`;

        const formData = new FormData();
        const jsonBody = {
            type: payload.type,
            body: payload.body,
            feedback: {
                feedback_name: payload.feedbackName.trim(),
                feedback_email: payload.feedbackEmail.trim()
            }
        };
        formData.append(
            "payload",
            new Blob([JSON.stringify(jsonBody)], { type: "application/json" }),
            "payload.json"
        );
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
            const data = (await response.json()) as { body?: { complaints?: MyComplaintItem[] } };
            const raw = data?.body?.complaints;
            const complaints = Array.isArray(raw) ? raw : [];
            return { success: true, complaints };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "unvailable";
            return { success: false, error: message, status: 500 };
        }
    }
}

export const supportService = new SupportService();
