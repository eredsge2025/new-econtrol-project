import api from './client';
import type {
    AuthResponse,
    LoginCredentials,
    RegisterData,
    RegisterLanAdminData,
    User,
    PendingApproval
} from '@/types';

export const authApi = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const { data } = await api.post('/auth/login', credentials);
        return data;
    },

    register: async (registerData: RegisterData): Promise<AuthResponse> => {
        const { data } = await api.post('/auth/register', registerData);
        return data;
    },

    registerLanAdmin: async (registerData: RegisterLanAdminData) => {
        const { data } = await api.post('/auth/register-lan-admin', registerData);
        return data;
    },

    getProfile: async (): Promise<User> => {
        const { data } = await api.get('/auth/profile');
        return data;
    },
};

export const adminApi = {
    getPendingApprovals: async (): Promise<PendingApproval[]> => {
        const { data } = await api.get('/admin/pending-approvals');
        return data;
    },

    approveUser: async (userId: string, createLan: Boolean = false) => {
        const { data } = await api.post(`/admin/approvals/${userId}/approve`, {
            createLan,
        });
        return data;
    },

    rejectUser: async (userId: string, reason?: string) => {
        const { data } = await api.post(`/admin/approvals/${userId}/reject`, {
            reason,
        });
        return data;
    },

    getApprovalStats: async () => {
        const { data } = await api.get('/admin/approval-stats');
        return data;
    },

    getApprovalLogs: async (params?: {
        action?: 'APPROVED' | 'REJECTED';
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.action) queryParams.append('action', params.action);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.offset) queryParams.append('offset', params.offset.toString());

        const { data } = await api.get(`/admin/logs?${queryParams.toString()}`);
        return data;
    },
};

export const lansApi = {
    getAll: async () => {
        const { data } = await api.get('/lans');
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get(`/lans/${id}`);
        return data;
    },

    create: async (lanData: any) => {
        const { data } = await api.post('/lans', lanData);
        return data;
    },

    update: async (id: string, lanData: any) => {
        const { data } = await api.patch(`/lans/${id}`, lanData);
        return data;
    },

    delete: async (id: string) => {
        await api.delete(`/lans/${id}`);
    },

    getStats: async (id: string) => {
        const { data } = await api.get(`/lans/${id}/stats`);
        return data;
    },
};

export const zonesApi = {
    getByLan: async (lanId: string) => {
        const { data } = await api.get(`/lans/${lanId}/zones`);
        return data;
    },

    create: async (lanId: string, zoneData: any) => {
        const { data } = await api.post(`/lans/${lanId}/zones`, zoneData);
        return data;
    },

    update: async (id: string, zoneData: any) => {
        const { data } = await api.patch(`/zones/${id}`, zoneData);
        return data;
    },

    delete: async (id: string) => {
        await api.delete(`/zones/${id}`);
    },
};

export const pcsApi = {
    getByZone: async (zoneId: string) => {
        const { data } = await api.get(`/zones/${zoneId}/pcs`);
        return data;
    },

    create: async (zoneId: string, pcData: any) => {
        const { data } = await api.post(`/zones/${zoneId}/pcs`, pcData);
        return data;
    },

    update: async (id: string, pcData: any) => {
        const { data } = await api.patch(`/pcs/${id}`, pcData);
        return data;
    },

    updateStatus: async (id: string, status: string) => {
        const { data } = await api.patch(`/pcs/${id}/status`, { status });
        return data;
    },
};

export const sessionsApi = {
    start: async (sessionData: { pcId: string; pricingType: string; bundleId?: string; minutes?: number; userId?: string }) => {
        const { data } = await api.post('/sessions/start', sessionData);
        return data;
    },

    extend: async (id: string, sessionData: { pricingType: string; bundleId?: string; minutes?: number }) => {
        const { data } = await api.post(`/sessions/${id}/extend`, sessionData);
        return data;
    },

    undo: async (id: string) => {
        const { data } = await api.post(`/sessions/${id}/undo`);
        return data;
    },

    end: async (id: string, paymentMethod: string) => {
        const { data } = await api.post(`/sessions/${id}/end`, { paymentMethod });
        return data;
    },

    getActive: async (lanId?: string) => {
        const params = lanId ? { lanId } : {};
        const { data } = await api.get('/sessions/active', { params });
        return data;
    },

    getCostPreview: async (id: string) => {
        const { data } = await api.get(`/sessions/${id}/cost-preview`);
        return data;
    },
};

export const bundlesApi = {
    getByZone: async (zoneId: string) => {
        const { data } = await api.get(`/zones/${zoneId}/bundles`);
        return data;
    },

    create: async (zoneId: string, bundleData: any) => {
        const { data } = await api.post(`/zones/${zoneId}/bundles`, bundleData);
        return data;
    },

    update: async (id: string, bundleData: any) => {
        const { data } = await api.patch(`/bundles/${id}`, bundleData);
        return data;
    },

    delete: async (id: string) => {
        await api.delete(`/bundles/${id}`);
    },
};

export const rateSchedulesApi = {
    getByZone: async (zoneId: string) => {
        const { data } = await api.get(`/zones/${zoneId}/rate-schedules`);
        return data;
    },

    create: async (zoneId: string, scheduleData: any) => {
        const { data } = await api.post(`/zones/${zoneId}/rate-schedules`, scheduleData);
        return data;
    },

    generateFromBaseRate: async (zoneId: string) => {
        const { data } = await api.post(`/zones/${zoneId}/rate-schedules/generate`);
        return data;
    },

    update: async (id: string, scheduleData: any) => {
        const { data } = await api.patch(`/rate-schedules/${id}`, scheduleData);
        return data;
    },

    delete: async (id: string) => {
        await api.delete(`/rate-schedules/${id}`);
    },
};

export const usersApi = {
    getAll: async (lanId?: string) => {
        const params = lanId ? { lanId } : {};
        const { data } = await api.get('/users', { params });
        return data;
    },

    create: async (userData: any) => {
        const { data } = await api.post('/users', userData);
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get(`/users/${id}`);
        return data;
    },

    getStats: async (id: string) => {
        const { data } = await api.get(`/users/${id}/stats`);
        return data;
    },

    update: async (id: string, userData: any) => {
        const { data } = await api.patch(`/users/${id}`, userData);
        return data;
    },

    recharge: async (id: string, amount: number) => {
        const { data } = await api.post(`/users/${id}/recharge`, { amount });
        return data;
    },
};

