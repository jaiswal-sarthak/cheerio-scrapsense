import axios from 'axios';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';

type Selector = {
    field: string;
    selector: string;
    attribute?: string;
};

interface ExtractionSchema {
    selectors: Selector[];
    filters?: string[] | Record<string, any>;
}

interface ScrapeResult {
    title: string;
    description?: string;
    url: string;
    metadata?: Record<string, unknown>;
}

/**
 * Lightweight scraper using axios and cheerio
 * No browser required - faster but may miss dynamic content
 */
export const runScrapeCheerio = async (
    targetUrl: string,
    schema: ExtractionSchema
): Promise<ScrapeResult[]> => {
    console.log(`[Cheerio Scraper] Scraping ${targetUrl}`);

    try {
        // Fetch HTML
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': process.env.SCRAPER_DEFAULT_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 45000,
        });

        const html = response.data;
        const $ = cheerio.load(html);

        const primarySelector = schema.selectors[0]?.selector ?? 'body';
        const nodes = $(primarySelector);

        console.log(`[Cheerio Scraper] Found ${nodes.length} nodes matching "${primarySelector}"`);

        if (nodes.length === 0) {
            throw new Error(
                `No elements found with selector "${primarySelector}". The page structure may have changed. Try regenerating the schema.`
            );
        }

        const results: ScrapeResult[] = [];

        nodes.each((_, node) => {
            const $node = $(node);
            const metadata: Record<string, unknown> = {};

            for (const selector of schema.selectors) {
                if (selector.selector !== primarySelector) {
                    const nested = $node.find(selector.selector).first();
                    metadata[selector.field] = sanitizeHtml(
                        selector.attribute ? nested.attr(selector.attribute) ?? '' : nested.text() ?? ''
                    ).trim();
                } else {
                    metadata[selector.field] = sanitizeHtml(
                        selector.attribute ? $node.attr(selector.attribute) ?? '' : $node.text() ?? ''
                    ).trim();
                }
            }

            // Apply filters
            if (schema.filters) {
                let pass = true;
                const filters = Array.isArray(schema.filters)
                    ? schema.filters
                    : Object.entries(schema.filters).map(([key, val]) => ({ field: key, ...val }));

                for (const filter of filters as any[]) {
                    const field = filter.field || filter.key;
                    const value = metadata[field];
                    if (value === undefined) continue;

                    const numValue = parseFloat((value as string).replace(/[^0-9.-]/g, ''));
                    const targetValue = filter.value;

                    if (!isNaN(numValue) && typeof targetValue === 'number') {
                        if (filter.operator === '>' && !(numValue > targetValue)) pass = false;
                        if (filter.operator === '<' && !(numValue < targetValue)) pass = false;
                        if (filter.operator === '>=' && !(numValue >= targetValue)) pass = false;
                        if (filter.operator === '<=' && !(numValue <= targetValue)) pass = false;
                        if (filter.operator === '=' && !(numValue === targetValue)) pass = false;
                    }
                }
                if (!pass) return;
            }

            const title =
                (metadata.title as string) ||
                (metadata.name as string) ||
                $node.text().trim().slice(0, 80) ||
                targetUrl;

            const description =
                (metadata.description as string) || sanitizeHtml($node.text()).slice(0, 140);

            const link =
                (metadata.link as string) || $node.find('a').first().attr('href') || targetUrl;

            let resolvedUrl = targetUrl;
            try {
                resolvedUrl = link.startsWith('http') ? link : new URL(link, targetUrl).toString();
            } catch {
                resolvedUrl = targetUrl;
            }

            results.push({
                title,
                description,
                url: resolvedUrl,
                metadata,
            });
        });

        console.log(`[Cheerio Scraper] Scraped ${results.length} results`);
        return results.slice(0, 50);
    } catch (error) {
        console.error(`[Cheerio Scraper] Error:`, error);
        if (axios.isAxiosError(error)) {
            throw new Error(`Failed to fetch page: ${error.message}`);
        }
        throw error;
    }
};
