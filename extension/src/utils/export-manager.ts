// Export Manager - Handle different export formats
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ScrapedData, ExportOptions } from '../types';
import { apiClient } from './api-client';

export class ExportManager {
    async export(data: ScrapedData[], options: ExportOptions): Promise<void> {
        if (data.length === 0) {
            throw new Error('No data to export');
        }

        // Generate file based on format
        let blob: Blob;
        let filename: string;

        switch (options.format) {
            case 'csv':
                blob = this.exportCSV(data);
                filename = `scrapsense-${Date.now()}.csv`;
                break;
            case 'xlsx':
                blob = this.exportXLSX(data);
                filename = `scrapsense-${Date.now()}.xlsx`;
                break;
            case 'json':
                blob = this.exportJSON(data);
                filename = `scrapsense-${Date.now()}.json`;
                break;
            default:
                throw new Error('Invalid export format');
        }

        // Handle email sending
        if (options.sendEmail && options.email) {
            await this.sendEmail(data, options.email, options.format);
        }

        // Handle Telegram sending
        if (options.sendTelegram && options.telegramChatId) {
            await this.sendTelegram(data, options.telegramChatId, options.format);
        }

        // Download file
        this.downloadBlob(blob, filename);
    }

    private exportCSV(data: ScrapedData[]): Blob {
        const csv = Papa.unparse(data);
        return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    }

    private exportXLSX(data: ScrapedData[]): Blob {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ScrapedData');

        // Auto-size columns
        const maxWidth = 50;
        const colWidths = Object.keys(data[0] || {}).map(key => {
            const maxLen = Math.max(
                key.length,
                ...data.map(row => String(row[key] || '').length)
            );
            return { wch: Math.min(maxLen + 2, maxWidth) };
        });
        worksheet['!cols'] = colWidths;

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }

    private exportJSON(data: ScrapedData[]): Blob {
        const json = JSON.stringify(data, null, 2);
        return new Blob([json], { type: 'application/json;charset=utf-8;' });
    }

    private downloadBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    private async sendEmail(data: ScrapedData[], email: string, format: 'csv' | 'xlsx' | 'json'): Promise<void> {
        try {
            // Backend only supports csv/json, so convert xlsx to csv for email
            const emailFormat = format === 'xlsx' ? 'csv' : format;
            await apiClient.sendToEmail(data, email, emailFormat as 'csv' | 'json');
        } catch (error) {
            console.error('Failed to send email:', error);
            throw new Error('Failed to send email. Please check your email settings.');
        }
    }

    private async sendTelegram(data: ScrapedData[], chatId: string, format: 'csv' | 'xlsx' | 'json'): Promise<void> {
        try {
            // Backend only supports csv/json, so convert xlsx to csv for telegram
            const telegramFormat = format === 'xlsx' ? 'csv' : format;
            await apiClient.sendToTelegram(data, chatId, telegramFormat as 'csv' | 'json');
        } catch (error) {
            console.error('Failed to send to Telegram:', error);
            throw new Error('Failed to send to Telegram. Please check your Telegram settings.');
        }
    }
}

export const exportManager = new ExportManager();
