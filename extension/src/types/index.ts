// Type definitions for extension
export interface User {
    id: string;
    email: string;
    name: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface ScrapedData {
    [key: string]: string | number | null;
}

export interface ScrapeTask {
    id: string;
    url: string;
    title: string;
    selectors: Record<string, string>;
    data: ScrapedData[];
    createdAt: string;
    status: 'pending' | 'completed' | 'failed';
}

export interface ExtensionSettings {
    telegramChatId?: string;
    notificationEmail?: string;
    autoSave: boolean;
    maxPages: number;
}

export interface ExportOptions {
    format: 'csv' | 'xlsx' | 'json';
    sendEmail?: boolean;
    sendTelegram?: boolean;
    email?: string;
    telegramChatId?: string;
}

export interface ElementInfo {
    selector: string;
    fieldName: string;
    dataType: 'text' | 'link' | 'image' | 'price' | 'date';
    sampleValue: string;
}

export interface SelectionState {
    isActive: boolean;
    selectedElements: ElementInfo[];
    currentUrl: string;
}

export interface PaginationConfig {
    enabled: boolean;
    nextButtonSelector?: string;
    maxPages: number;
    currentPage: number;
}
