import { httpClient } from "../core/utils/httpClient";

import { BASE_URL } from '../core/utils/apiBase';

export type ComplaintStatus = 'new' | 'in_progress' | 'closed';
export type ComplaintItemType = 'bug' | 'idea' | 'claim' | 'suggestion' | string;

export interface Complaint {
    id?: string | number;
    type: ComplaintItemType;
    status: ComplaintStatus | string;
    feedback?: {
        feedback_name?: string;
        feedback_email?: string;
    };
    body: string;
    user_id?: number;
    created_at: string;
    updated_at: string;
}

interface GetAllComplaintsResponse {
    body: {
        complaints: Complaint[];
    };
}

class ComplaintsAdminService {
    async getAllComplaints(): Promise<Complaint[]> {
        const response = await httpClient.request(`${BASE_URL}/api/v1/complaints/all`);
        if (!response.ok) {
            throw new Error(`Ошибка получения обращений: ${response.status}`);
        }
        const data: GetAllComplaintsResponse = await response.json();
        return data.body?.complaints ?? [];
    }

    async updateStatus(complaint_id: string | number, status: ComplaintStatus | string): Promise<void> {
        const response = await httpClient.request(`${BASE_URL}/api/v1/complaints/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                complaint_id, 
                status 
            }),
        });
        if (!response.ok) {
            let message = `Ошибка обновления статуса: ${response.status}`;
            try {
                const errData = await response.json() as { message?: string; errors?: { message?: string }[] };
                if (errData.errors?.length) {
                    message = errData.errors.map(e => e.message).filter(Boolean).join('; ');
                } else if (errData.message) {
                    message = errData.message;
                }
            } catch { /* ignore parse error */ }
            throw new Error(message);
        }
    }
}

export const complaintsAdminService = new ComplaintsAdminService();
