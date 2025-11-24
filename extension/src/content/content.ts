// Content Script - Injected into web pages for element selection
import { selectorGenerator } from '../utils/selector-generator';
import { dataExtractor } from '../utils/data-extractor';
import { autoDetector } from '../utils/auto-detector';
import { ElementInfo, SelectionState, PaginationConfig } from '../types';

class ContentScript {
    private isActive = false;
    private selectedElements: Map<Element, ElementInfo> = new Map();
    private highlightOverlays: Map<Element, HTMLElement> = new Map();
    private hoverOverlay: HTMLElement | null = null;
    private paginationConfig: PaginationConfig = {
        enabled: false,
        maxPages: 5,
        currentPage: 1
    };

    constructor() {
        this.init();
    }

    private init(): void {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sendResponse);
            return true; // Keep channel open for async response
        });

        // Create hover overlay
        this.createHoverOverlay();
    }

    private handleMessage(message: any, sendResponse: (response: any) => void): void {
        switch (message.type) {
            case 'START_SELECTION':
                this.startSelection();
                sendResponse({ success: true });
                break;

            case 'STOP_SELECTION':
                this.stopSelection();
                sendResponse({ success: true });
                break;

            case 'GET_SELECTION':
                sendResponse({
                    elements: Array.from(this.selectedElements.values()),
                    url: window.location.href
                });
                break;

            case 'EXTRACT_DATA':
                this.extractData(sendResponse);
                break;

            case 'AUTO_SCRAPE':
                this.handleAutoScrape(sendResponse);
                break;

            case 'SELECT_NEXT_BUTTON':
                this.selectNextButton(sendResponse);
                break;

            case 'CLEAR_SELECTION':
                this.clearSelection();
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ error: 'Unknown message type' });
        }
    }

    private startSelection(): void {
        if (this.isActive) return;

        this.isActive = true;
        document.addEventListener('mouseover', this.handleMouseOver);
        document.addEventListener('mouseout', this.handleMouseOut);
        document.addEventListener('click', this.handleClick);
        document.body.style.cursor = 'crosshair';

        this.showNotification('Click elements to select data fields. Press ESC to finish.');
    }

    private stopSelection(): void {
        if (!this.isActive) return;

        this.isActive = false;
        document.removeEventListener('mouseover', this.handleMouseOver);
        document.removeEventListener('mouseout', this.handleMouseOut);
        document.removeEventListener('click', this.handleClick);
        document.body.style.cursor = 'default';

        if (this.hoverOverlay) {
            this.hoverOverlay.style.display = 'none';
        }
    }

    private handleMouseOver = (e: MouseEvent): void => {
        if (!this.isActive) return;

        const target = e.target as Element;
        if (!target || target === document.body || target === document.documentElement) return;

        this.showHoverOverlay(target);
    };

    private handleMouseOut = (): void => {
        if (this.hoverOverlay) {
            this.hoverOverlay.style.display = 'none';
        }
    };

    private handleClick = (e: MouseEvent): void => {
        if (!this.isActive) return;

        e.preventDefault();
        e.stopPropagation();

        const target = e.target as Element;
        if (!target) return;

        if (this.selectedElements.has(target)) {
            // Deselect
            this.deselectElement(target);
        } else {
            // Select
            this.selectElement(target);
        }
    };

    private selectElement(element: Element): void {
        const selector = selectorGenerator.generate(element);
        const fieldName = this.generateFieldName(element);
        const dataType = this.detectDataType(element);
        const sampleValue = this.getSampleValue(element);

        const elementInfo: ElementInfo = {
            selector,
            fieldName,
            dataType,
            sampleValue
        };

        this.selectedElements.set(element, elementInfo);
        this.createHighlightOverlay(element);

        this.showNotification(`Selected: ${fieldName} (${dataType})`);
    }

    private deselectElement(element: Element): void {
        this.selectedElements.delete(element);

        const overlay = this.highlightOverlays.get(element);
        if (overlay) {
            overlay.remove();
            this.highlightOverlays.delete(element);
        }
    }

    private clearSelection(): void {
        this.selectedElements.clear();

        this.highlightOverlays.forEach(overlay => overlay.remove());
        this.highlightOverlays.clear();
    }

    private createHoverOverlay(): void {
        this.hoverOverlay = document.createElement('div');
        this.hoverOverlay.id = 'scrapsense-hover-overlay';
        this.hoverOverlay.style.cssText = `
      position: absolute;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 999999;
      display: none;
      transition: all 0.1s ease;
    `;
        document.body.appendChild(this.hoverOverlay);
    }

    private showHoverOverlay(element: Element): void {
        if (!this.hoverOverlay) return;

        const rect = element.getBoundingClientRect();
        this.hoverOverlay.style.display = 'block';
        this.hoverOverlay.style.top = `${rect.top + window.scrollY}px`;
        this.hoverOverlay.style.left = `${rect.left + window.scrollX}px`;
        this.hoverOverlay.style.width = `${rect.width}px`;
        this.hoverOverlay.style.height = `${rect.height}px`;
    }

    private createHighlightOverlay(element: Element): void {
        const overlay = document.createElement('div');
        overlay.className = 'scrapsense-selected-overlay';

        const rect = element.getBoundingClientRect();
        overlay.style.cssText = `
      position: absolute;
      border: 3px solid #10b981;
      background: rgba(16, 185, 129, 0.15);
      pointer-events: none;
      z-index: 999998;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
      animation: pulse 2s infinite;
    `;

        document.body.appendChild(overlay);
        this.highlightOverlays.set(element, overlay);
    }

    private generateFieldName(element: Element): string {
        // Try to infer field name from element
        const label = element.closest('label')?.textContent?.trim();
        if (label) return this.sanitizeFieldName(label);

        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return this.sanitizeFieldName(ariaLabel);

        const placeholder = element.getAttribute('placeholder');
        if (placeholder) return this.sanitizeFieldName(placeholder);

        // Use tag name as fallback
        const tag = element.tagName.toLowerCase();
        const index = this.selectedElements.size + 1;
        return `${tag}_${index}`;
    }

    private sanitizeFieldName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, 30);
    }

    private detectDataType(element: Element): ElementInfo['dataType'] {
        if (element.tagName === 'A') return 'link';
        if (element.tagName === 'IMG') return 'image';

        const text = element.textContent?.trim() || '';
        if (/[$€£¥₹]/.test(text) || /^\d+\.\d{2}$/.test(text)) return 'price';
        if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(text)) return 'date';

        return 'text';
    }

    private getSampleValue(element: Element): string {
        if (element.tagName === 'A') {
            return (element as HTMLAnchorElement).href;
        }
        if (element.tagName === 'IMG') {
            return (element as HTMLImageElement).src;
        }
        return element.textContent?.trim().substring(0, 50) || '';
    }

    private extractData(sendResponse: (response: any) => void): void {
        const selectors: Record<string, string> = {};

        this.selectedElements.forEach((info, element) => {
            selectors[info.fieldName] = info.selector;
        });

        const data = dataExtractor.extract(selectors);
        const cleanedData = dataExtractor.cleanData(data);

        sendResponse({
            success: true,
            data: cleanedData,
            count: cleanedData.length,
            selectors
        });

        this.stopSelection();
    }

    private handleAutoScrape(sendResponse: (response: any) => void): void {
        console.log('[ContentScript] Starting auto-scrape detection...');
        this.clearSelection();
        const selectors = autoDetector.detect();
        console.log('[ContentScript] Detected selectors:', selectors);

        if (!selectors || Object.keys(selectors).length === 0) {
            console.warn('[ContentScript] No selectors found');
            sendResponse({ success: false, error: 'No suitable data found' });
            this.showNotification('Could not automatically detect data.');
            return;
        }

        // Apply selections visually
        for (const [fieldName, selector] of Object.entries(selectors)) {
            const element = document.querySelector(selector);
            if (element) {
                this.selectElement(element);
                // Update the field name to match what we detected
                const info = this.selectedElements.get(element);
                if (info) {
                    info.fieldName = fieldName;
                    // Force update map
                    this.selectedElements.set(element, info);
                }
            }
        }

        this.showNotification('Auto-detected data fields!');
        sendResponse({ success: true, selectors });
    }

    private selectNextButton(sendResponse: (response: any) => void): void {
        this.showNotification('Click the "Next" or pagination button');

        const clickHandler = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target as Element;
            const selector = selectorGenerator.generate(target);

            this.paginationConfig.nextButtonSelector = selector;

            document.removeEventListener('click', clickHandler);

            sendResponse({
                success: true,
                selector
            });

            this.showNotification('Next button selected!');
        };

        document.addEventListener('click', clickHandler, { once: true });
    }

    private showNotification(message: string): void {
        // Remove existing notification
        const existing = document.getElementById('scrapsense-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.id = 'scrapsense-notification';
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1f2937;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 9999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize content script
new ContentScript();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
