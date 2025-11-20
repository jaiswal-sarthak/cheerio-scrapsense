import axios from 'axios';
import * as cheerio from 'cheerio';

interface PagePatterns {
    dataTestAttributes: string[];
    dataTestIdAttributes: string[];
    commonClasses: string[];
    repeatingSelectors: string[];
    semanticTags: string[];
}

interface InspectionResult {
    html: string;
    htmlSnippet: string;
    patterns: PagePatterns;
    title: string;
}

/**
 * Lightweight HTML inspector using axios and cheerio
 * No browser required - faster but may miss dynamic content
 */
export async function inspectPageCheerio(url: string): Promise<InspectionResult> {
    console.log(`[Cheerio Inspector] Fetching ${url}`);

    try {
        // Fetch HTML using axios
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 30000,
        });

        const html = response.data;
        const $ = cheerio.load(html);

        console.log(`[Cheerio Inspector] Page loaded successfully`);

        // Extract patterns
        const patterns: PagePatterns = {
            dataTestAttributes: [],
            dataTestIdAttributes: [],
            commonClasses: [],
            repeatingSelectors: [],
            semanticTags: [],
        };

        // Find data-test attributes
        $('[data-test]').each((_, el) => {
            const attr = $(el).attr('data-test');
            if (attr && patterns.dataTestAttributes.length < 50) {
                patterns.dataTestAttributes.push(attr);
            }
        });

        // Find data-testid attributes
        $('[data-testid]').each((_, el) => {
            const attr = $(el).attr('data-testid');
            if (attr && patterns.dataTestIdAttributes.length < 50) {
                patterns.dataTestIdAttributes.push(attr);
            }
        });

        // Find common classes
        const classMap = new Map<string, number>();
        $('[class]').each((_, el) => {
            const classes = $(el).attr('class')?.split(' ').filter(c => c.trim()) || [];
            classes.forEach(cls => {
                classMap.set(cls, (classMap.get(cls) || 0) + 1);
            });
        });

        patterns.commonClasses = Array.from(classMap.entries())
            .filter(([, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30)
            .map(([cls]) => cls);

        // Find semantic tags
        const semanticSelectors = ['article', 'section', 'main', 'aside', 'nav', 'header', 'footer'];
        semanticSelectors.forEach(tag => {
            .filter(([, count]) => count >= 3)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20)
                .map(([selector, count]) => `${selector} (${count})`);

            // Get title
            const title = $('title').text() || 'Untitled';

            // Create HTML snippet
            const htmlSnippet = html.substring(0, 15000);

            console.log(`[Cheerio Inspector] Successfully inspected ${url}`);

            return {
                html,
                htmlSnippet,
                patterns,
                title,
            };
        } catch (error) {
            console.error(`[Cheerio Inspector] Error:`, error);
            if (axios.isAxiosError(error)) {
                throw new Error(`Failed to fetch page: ${error.message}`);
            }
            throw error;
        }
    }
