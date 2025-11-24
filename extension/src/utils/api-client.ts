// API Client for Chrome Extension
import { User, AuthResponse, ScrapeTask, ScrapedData, ExportOptions } from '../types';

// Use localhost for development/testing
export const API_BASE_URL = 'http://localhost:3000';

class APIClient {
    private token: string | null = null;

    constructor() {
        this.loadToken();
    }

    private async loadToken(): Promise<void> {
        const result = await chrome.storage.local.get(['authToken']);
        this.token = result.authToken || null;
    }

    private async saveToken(token: string): Promise<void> {
        await chrome.storage.local.set({ authToken: token });
        this.token = token;
    }

    private async clearToken(): Promise<void> {
        await chrome.storage.local.remove(['authToken']);
        this.token = null;
    }

    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                await this.clearToken();
                throw new Error('Unauthorized. Please login again.');
            }
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Authentication
    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>('/api/extension/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        await this.saveToken(response.token);
        return response;
    }

    async logout(): Promise<void> {
        await this.clearToken();
    }

    async getCurrentUser(): Promise<User> {
        return this.request<User>('/api/extension/user/me');
    }

    async isAuthenticated(): Promise<boolean> {
        await this.loadToken();
        if (!this.token) return false;

        try {
            await this.getCurrentUser();
            return true;
        } catch {
            return false;
        }
    }

    // Tasks
    async getTasks(): Promise<ScrapeTask[]> {
        const response = await this.request<{ tasks: ScrapeTask[] }>('/api/extension/tasks');
        return response.tasks;
    }

    async createTask(task: {
        url: string;
        title: string;
        selectors: Record<string, string>;
        data: any[];
    }): Promise<ScrapeTask> {
        return this.request<ScrapeTask>('/api/extension/tasks', {
            method: 'POST',
            body: JSON.stringify(task),
        });
    }

    // Export
    async exportData(data: any[], options: ExportOptions): Promise<Blob> {
        const params = new URLSearchParams({
            format: options.format,
        });

        const response = await fetch(`${API_BASE_URL}/api/export?${params}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ data }),
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        return response.blob();
    }

    async sendToTelegram(data: any[], chatId: string, format: 'csv' | 'json' = 'csv'): Promise<void> {
        await this.request('/api/export/telegram', {
            method: 'POST',
            body: JSON.stringify({ data, chatId, format }),
        });
    }

    async sendToEmail(data: any[], email: string, format: 'csv' | 'json' = 'csv'): Promise<void> {
        await this.request('/api/notifications/send-email', {
            method: 'POST',
            body: JSON.stringify({ data, email, format }),
        });
    }
}

export const apiClient = new APIClient();
