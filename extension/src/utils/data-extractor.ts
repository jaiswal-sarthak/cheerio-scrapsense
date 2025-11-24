// Data Extractor - Extract data from elements based on selectors
import { ScrapedData } from '../types';

export class DataExtractor {
    extract(selectors: Record<string, string>): ScrapedData[] {
        // Find all instances of the pattern
        const firstSelector = Object.values(selectors)[0];
        if (!firstSelector) return [];

        // Get the base selector (parent container for each item)
        const baseSelector = this.getBaseSelector(firstSelector);
        const containers = document.querySelectorAll(baseSelector);

        if (containers.length === 0) {
            // Single item extraction
            return [this.extractSingle(selectors)];
        }

        // Multiple items extraction
        const results: ScrapedData[] = [];
        containers.forEach(container => {
            const data = this.extractFromContainer(container, selectors);
            if (Object.keys(data).length > 0) {
                results.push(data);
            }
        });

        return results;
    }

    private extractSingle(selectors: Record<string, string>): ScrapedData {
        const data: ScrapedData = {};

        for (const [fieldName, selector] of Object.entries(selectors)) {
            const element = document.querySelector(selector);
            if (element) {
                data[fieldName] = this.extractValue(element);
            }
        }

        return data;
    }

    private extractFromContainer(container: Element, selectors: Record<string, string>): ScrapedData {
        const data: ScrapedData = {};

        for (const [fieldName, selector] of Object.entries(selectors)) {
            // Try to find element within container
            const relativeSelector = this.makeRelative(selector);
            const element = container.querySelector(relativeSelector);

            if (element) {
                data[fieldName] = this.extractValue(element);
            }
        }

        return data;
    }

    private extractValue(element: Element): string | number | null {
        // Check for specific data types
        if (element.tagName === 'A') {
            return (element as HTMLAnchorElement).href;
        }

        if (element.tagName === 'IMG') {
            return (element as HTMLImageElement).src;
        }

        // Get text content
        let text = element.textContent?.trim() || '';

        // Try to detect and parse numbers/prices
        if (this.isPrice(text)) {
            return this.parsePrice(text);
        }

        if (this.isNumber(text)) {
            return parseFloat(text.replace(/,/g, ''));
        }

        return text;
    }

    private isPrice(text: string): boolean {
        return /[$€£¥₹]/.test(text) || /\d+\.\d{2}/.test(text);
    }

    private parsePrice(text: string): number {
        const match = text.match(/[\d,]+\.?\d*/);
        if (match) {
            return parseFloat(match[0].replace(/,/g, ''));
        }
        return 0;
    }

    private isNumber(text: string): boolean {
        return /^\d+[,\d]*\.?\d*$/.test(text);
    }

    private getBaseSelector(selector: string): string {
        // Extract the repeating parent container
        const parts = selector.split(' > ');
        if (parts.length > 2) {
            return parts.slice(0, -1).join(' > ');
        }
        return selector;
    }

    private makeRelative(selector: string): string {
        // Remove parent selectors to make it relative to container
        const parts = selector.split(' > ');
        return parts[parts.length - 1];
    }

    // Extract data with pagination
    async extractWithPagination(
        selectors: Record<string, string>,
        nextButtonSelector: string | null,
        maxPages: number,
        onProgress?: (page: number, data: ScrapedData[]) => void
    ): Promise<ScrapedData[]> {
        const allData: ScrapedData[] = [];
        let currentPage = 1;

        while (currentPage <= maxPages) {
            // Extract data from current page
            const pageData = this.extract(selectors);
            allData.push(...pageData);

            if (onProgress) {
                onProgress(currentPage, pageData);
            }

            // Check if there's a next button
            if (!nextButtonSelector || currentPage >= maxPages) {
                break;
            }

            const nextButton = document.querySelector(nextButtonSelector) as HTMLElement;
            if (!nextButton || nextButton.hasAttribute('disabled')) {
                break;
            }

            // Click next button and wait for page load
            nextButton.click();
            await this.waitForPageLoad();
            currentPage++;
        }

        return allData;
    }

    private waitForPageLoad(): Promise<void> {
        return new Promise(resolve => {
            // Wait for network idle
            setTimeout(resolve, 2000);
        });
    }

    // Clean and deduplicate data
    cleanData(data: ScrapedData[]): ScrapedData[] {
        const seen = new Set<string>();
        const cleaned: ScrapedData[] = [];

        for (const item of data) {
            // Create a hash of the item
            const hash = JSON.stringify(item);

            if (!seen.has(hash)) {
                seen.add(hash);

                // Clean individual fields
                const cleanedItem: ScrapedData = {};
                for (const [key, value] of Object.entries(item)) {
                    if (typeof value === 'string') {
                        cleanedItem[key] = value.trim().replace(/\s+/g, ' ');
                    } else {
                        cleanedItem[key] = value;
                    }
                }

                cleaned.push(cleanedItem);
            }
        }

        return cleaned;
    }
}

export const dataExtractor = new DataExtractor();
