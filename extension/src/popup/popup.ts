// Popup Script - Main UI logic
import { apiClient, API_BASE_URL } from '../utils/api-client';
import { exportManager } from '../utils/export-manager';
import { ScrapedData, ExportOptions, ExtensionSettings } from '../types';

class PopupApp {
    private currentData: ScrapedData[] = [];
    private selectedFields: any[] = [];
    private settings: ExtensionSettings = {
        autoSave: true,
        maxPages: 5
    };

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        // Load settings
        await this.loadSettings();

        // Check authentication
        const isAuth = await apiClient.isAuthenticated();

        if (isAuth) {
            this.showDashboard();
            await this.loadUserInfo();
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Login
        const loginForm = document.getElementById('login-form') as HTMLFormElement;
        loginForm?.addEventListener('submit', (e) => this.handleLogin(e));

        // Google OAuth Login
        document.getElementById('google-login-btn')?.addEventListener('click', () => this.handleGoogleLogin());

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab((e.target as HTMLElement).dataset.tab!));
        });

        // Scraping
        document.getElementById('start-scraping-btn')?.addEventListener('click', () => this.startScraping());
        document.getElementById('auto-scrape-btn')?.addEventListener('click', () => this.autoScrape());
        document.getElementById('extract-btn')?.addEventListener('click', () => this.extractData());
        document.getElementById('clear-selection-btn')?.addEventListener('click', () => this.clearSelection());
        document.getElementById('select-next-btn')?.addEventListener('click', () => this.selectNextButton());

        // Pagination
        document.getElementById('enable-pagination')?.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            const options = document.getElementById('pagination-options');
            if (options) options.style.display = enabled ? 'block' : 'none';
        });

        // Export
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = (e.currentTarget as HTMLElement).dataset.format as 'csv' | 'xlsx' | 'json';
                this.handleExport(format);
            });
        });

        // Export options
        document.getElementById('send-email-check')?.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            const input = document.getElementById('export-email');
            if (input) input.style.display = checked ? 'block' : 'none';
        });

        document.getElementById('send-telegram-check')?.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            const input = document.getElementById('export-telegram');
            if (input) input.style.display = checked ? 'block' : 'none';
        });

        // Settings
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());

        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'SELECTION_UPDATED') {
                this.updateSelectionInfo(message.fields);
            }
        });
    }

    private async handleLogin(e: Event): Promise<void> {
        e.preventDefault();

        const email = (document.getElementById('email') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const errorDiv = document.getElementById('login-error')!;
        const btn = document.querySelector('#login-form .btn') as HTMLButtonElement;
        const btnText = btn.querySelector('.btn-text') as HTMLElement;
        const btnLoader = btn.querySelector('.btn-loader') as HTMLElement;

        try {
            // Show loading
            btnText.style.display = 'none';
            btnLoader.style.display = 'flex';
            btn.disabled = true;
            errorDiv.style.display = 'none';

            await apiClient.login(email, password);

            this.showDashboard();
            await this.loadUserInfo();
        } catch (error: any) {
            errorDiv.textContent = error.message || 'Login failed';
            errorDiv.style.display = 'block';
        } finally {
            btnText.style.display = 'block';
            btnLoader.style.display = 'none';
            btn.disabled = false;
        }
    }

    private async handleLogout(): Promise<void> {
        await apiClient.logout();
        this.showLogin();
    }

    private async handleGoogleLogin(): Promise<void> {
        const errorDiv = document.getElementById('login-error')!;
        errorDiv.style.display = 'none';

        try {
            // Use Chrome Identity API to get Google OAuth token
            chrome.identity.getAuthToken({ interactive: true }, async (token) => {
                if (chrome.runtime.lastError || !token) {
                    errorDiv.textContent = chrome.runtime.lastError?.message || 'Failed to authenticate with Google';
                    errorDiv.style.display = 'block';
                    return;
                }

                try {
                    // Exchange Google token for our app's JWT
                    const response = await fetch(`${API_BASE_URL}/api/extension/auth/google`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ idToken: token }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Google login failed');
                    }

                    // Save the JWT token
                    await chrome.storage.local.set({ authToken: data.token });

                    // Show dashboard
                    this.showDashboard();
                    await this.loadUserInfo();
                } catch (error) {
                    console.error('Google login error:', error);
                    errorDiv.textContent = error instanceof Error ? error.message : 'Google login failed';
                    errorDiv.style.display = 'block';

                    // Remove the cached Google token so user can try again
                    chrome.identity.removeCachedAuthToken({ token }, () => { });
                }
            });
        } catch (error) {
            console.error('Google OAuth error:', error);
            errorDiv.textContent = 'Failed to initiate Google login';
            errorDiv.style.display = 'block';
        }
    }

    private async loadUserInfo(): Promise<void> {
        try {
            const user = await apiClient.getCurrentUser();

            const nameEl = document.getElementById('user-name');
            const emailEl = document.getElementById('user-email');
            const avatarEl = document.getElementById('user-avatar');

            if (nameEl) nameEl.textContent = user.name || 'User';
            if (emailEl) emailEl.textContent = user.email;
            if (avatarEl) avatarEl.textContent = (user.name || user.email)[0].toUpperCase();
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    }

    private showLogin(): void {
        document.getElementById('login-screen')!.style.display = 'block';
        document.getElementById('dashboard-screen')!.style.display = 'none';
    }

    private showDashboard(): void {
        document.getElementById('login-screen')!.style.display = 'none';
        document.getElementById('dashboard-screen')!.style.display = 'block';
    }

    private switchTab(tabName: string): void {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }

    private async startScraping(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.id) return;

        // Send message to content script to start selection
        chrome.tabs.sendMessage(tab.id, { type: 'START_SELECTION' });

        // Show selection info
        document.getElementById('selection-info')!.style.display = 'block';
        document.getElementById('pagination-card')!.style.display = 'block';

        // Poll for selection updates
        this.pollSelection(tab.id);
    }

    private async autoScrape(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return;

        // Show loading state
        const btn = document.getElementById('auto-scrape-btn') as HTMLButtonElement;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Detecting...';
        btn.disabled = true;

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'AUTO_SCRAPE' });

            if (response.success) {
                // Show selection info
                document.getElementById('selection-info')!.style.display = 'block';
                document.getElementById('pagination-card')!.style.display = 'block';

                // Update fields list
                const fields = Object.entries(response.selectors).map(([fieldName, selector]) => ({
                    fieldName,
                    selector,
                    dataType: 'auto-detected'
                }));
                this.updateSelectionInfo(fields);
            } else {
                alert(response.error || 'Could not automatically detect data. Please try manual selection.');
            }
        } catch (error: any) {
            console.error('Auto scrape error:', error);
            if (error.message && (error.message.includes('Extension context invalidated') || error.message.includes('Could not establish connection'))) {
                alert('Please reload the web page and try again (Extension was updated).');
            } else {
                alert('Failed to communicate with the page. Try reloading.');
            }
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    private async pollSelection(tabId: number): Promise<void> {
        const interval = setInterval(async () => {
            try {
                const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_SELECTION' });
                this.updateSelectionInfo(response.elements);
            } catch (error) {
                clearInterval(interval);
            }
        }, 1000);

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(interval), 300000);
    }

    private updateSelectionInfo(fields: any[]): void {
        this.selectedFields = fields;

        const countEl = document.getElementById('field-count');
        const listEl = document.getElementById('fields-list');

        if (countEl) countEl.textContent = fields.length.toString();

        if (listEl) {
            listEl.innerHTML = fields.map(field => `
        <div class="field-item">
          <span class="field-name">${field.fieldName}</span>
          <span class="field-type">${field.dataType}</span>
        </div>
      `).join('');
        }
    }

    private async extractData(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.id) return;

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_DATA' });

            if (response.success) {
                this.currentData = response.data;
                this.displayData(response.data);
                this.switchTab('data');

                // Save to backend if auto-save is enabled
                if (this.settings.autoSave) {
                    await this.saveTask(response);
                }
            }
        } catch (error: any) {
            console.error('Failed to extract data:', error);
            if (error.message && (error.message.includes('Extension context invalidated') || error.message.includes('Could not establish connection'))) {
                alert('Please reload the web page and try again (Extension was updated).');
            } else {
                alert(`Failed to extract data: ${error.message || 'Unknown error'}`);
            }
        }
    }

    private async saveTask(extractionResult: any): Promise<void> {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            await apiClient.createTask({
                url: tab.url || '',
                title: tab.title || 'Untitled',
                selectors: extractionResult.selectors,
                data: extractionResult.data
            });
        } catch (error) {
            console.error('Failed to save task:', error);
        }
    }

    private async clearSelection(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.id) return;

        await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_SELECTION' });
        this.selectedFields = [];
        this.updateSelectionInfo([]);
    }

    private async selectNextButton(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.id) return;

        await chrome.tabs.sendMessage(tab.id, { type: 'SELECT_NEXT_BUTTON' });
    }

    private displayData(data: ScrapedData[]): void {
        const noDataEl = document.getElementById('no-data');
        const dataViewEl = document.getElementById('data-view');
        const countEl = document.getElementById('data-count');
        const containerEl = document.getElementById('data-table-container');

        if (data.length === 0) {
            if (noDataEl) noDataEl.style.display = 'block';
            if (dataViewEl) dataViewEl.style.display = 'none';
            return;
        }

        if (noDataEl) noDataEl.style.display = 'none';
        if (dataViewEl) dataViewEl.style.display = 'block';
        if (countEl) countEl.textContent = `${data.length} items`;

        // Create table
        const headers = Object.keys(data[0]);
        const table = `
      <table class="data-table">
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    `;

        if (containerEl) containerEl.innerHTML = table;
    }

    private async handleExport(format: 'csv' | 'xlsx' | 'json'): Promise<void> {
        if (this.currentData.length === 0) {
            alert('No data to export');
            return;
        }

        const sendEmail = (document.getElementById('send-email-check') as HTMLInputElement)?.checked;
        const sendTelegram = (document.getElementById('send-telegram-check') as HTMLInputElement)?.checked;
        const email = (document.getElementById('export-email') as HTMLInputElement)?.value;
        const telegramChatId = (document.getElementById('export-telegram') as HTMLInputElement)?.value;

        const options: ExportOptions = {
            format,
            sendEmail: sendEmail && !!email,
            sendTelegram: sendTelegram && !!telegramChatId,
            email: email || undefined,
            telegramChatId: telegramChatId || undefined
        };

        try {
            await exportManager.export(this.currentData, options);

            let message = `Exported ${this.currentData.length} items as ${format.toUpperCase()}`;
            if (options.sendEmail) message += ' and sent to email';
            if (options.sendTelegram) message += ' and sent to Telegram';

            alert(message);
        } catch (error: any) {
            alert(error.message || 'Export failed');
        }
    }

    private async loadSettings(): Promise<void> {
        const result = await chrome.storage.local.get(['settings']);
        if (result.settings) {
            this.settings = { ...this.settings, ...result.settings };

            // Populate settings form
            const emailInput = document.getElementById('settings-email') as HTMLInputElement;
            const telegramInput = document.getElementById('settings-telegram') as HTMLInputElement;

            if (emailInput && this.settings.notificationEmail) {
                emailInput.value = this.settings.notificationEmail;
            }
            if (telegramInput && this.settings.telegramChatId) {
                telegramInput.value = this.settings.telegramChatId;
            }
        }
    }

    private async saveSettings(): Promise<void> {
        const email = (document.getElementById('settings-email') as HTMLInputElement).value;
        const telegram = (document.getElementById('settings-telegram') as HTMLInputElement).value;

        this.settings.notificationEmail = email || undefined;
        this.settings.telegramChatId = telegram || undefined;

        await chrome.storage.local.set({ settings: this.settings });

        // Also update export inputs
        const exportEmail = document.getElementById('export-email') as HTMLInputElement;
        const exportTelegram = document.getElementById('export-telegram') as HTMLInputElement;

        if (exportEmail) exportEmail.value = email;
        if (exportTelegram) exportTelegram.value = telegram;

        alert('Settings saved!');
    }
}

// Initialize app
new PopupApp();
