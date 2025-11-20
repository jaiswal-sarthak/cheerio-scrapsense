/**
 * URL Adapter - Transforms JS-heavy URLs to Cheerio-friendly alternatives
 * Automatically tries RSS feeds, JSON APIs, and other static content sources
 */

interface UrlTransformation {
    original: string;
    adapted: string;
    type: 'rss' | 'json' | 'amp' | 'mobile' | 'original';
    reason: string;
}

/**
 * Detects if a URL is likely to be JS-heavy and difficult for Cheerio
 */
function isJsHeavySite(url: string): boolean {
    const jsHeavyDomains = [
        'reddit.com',
        'twitter.com',
        'x.com',
        'instagram.com',
        'facebook.com',
        'linkedin.com',
        'medium.com',
        'substack.com',
        'discord.com',
        'notion.so',
    ];

    try {
        const urlObj = new URL(url);
        return jsHeavyDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
        return false;
    }
}

/**
 * Attempts to transform a URL to a Cheerio-friendly alternative
 */
export function adaptUrlForCheerio(url: string): UrlTransformation {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        // Reddit transformations
        if (hostname.includes('reddit.com')) {
            // Try JSON API first (most reliable)
            if (!url.endsWith('.json') && !url.endsWith('.rss')) {
                const jsonUrl = url.replace(/\/$/, '') + '.json';
                return {
                    original: url,
                    adapted: jsonUrl,
                    type: 'json',
                    reason: 'Reddit requires JSON API for reliable scraping'
                };
            }
        }

        // Twitter/X transformations
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            // Suggest using Nitter (Twitter frontend)
            const nitterUrl = url.replace(/twitter\.com|x\.com/g, 'nitter.net');
            return {
                original: url,
                adapted: nitterUrl,
                type: 'original',
                reason: 'Twitter/X requires alternative frontend (Nitter) or API access'
            };
        }

        // Medium transformations
        if (hostname.includes('medium.com')) {
            // Try RSS feed
            if (url.includes('/@')) {
                const username = url.match(/@([^/]+)/)?.[1];
                if (username) {
                    return {
                        original: url,
                        adapted: `https://medium.com/feed/@${username}`,
                        type: 'rss',
                        reason: 'Medium user feeds work better via RSS'
                    };
                }
            }
        }

        // Generic RSS detection
        if (!url.includes('/feed') && !url.endsWith('.rss') && !url.endsWith('.xml')) {
            // Try common RSS feed paths
            const rssAttempts = [
                `${urlObj.origin}/feed`,
                `${urlObj.origin}/rss`,
                `${urlObj.origin}/feed.xml`,
                `${urlObj.origin}/rss.xml`,
            ];

            // Return first RSS attempt for JS-heavy sites
            if (isJsHeavySite(url)) {
                return {
                    original: url,
                    adapted: rssAttempts[0],
                    type: 'rss',
                    reason: 'JS-heavy site detected, trying RSS feed'
                };
            }
        }

        // AMP version for news sites
        if (hostname.includes('cnn.com') || hostname.includes('bbc.com') || hostname.includes('theguardian.com')) {
            if (!url.includes('/amp/')) {
                const ampUrl = url.replace(/\/([^/]+)$/, '/amp/$1');
                return {
                    original: url,
                    adapted: ampUrl,
                    type: 'amp',
                    reason: 'News site - AMP version is more Cheerio-friendly'
                };
            }
        }

        // Mobile version fallback
        if (isJsHeavySite(url) && !hostname.startsWith('m.')) {
            const mobileUrl = url.replace('://', '://m.');
            return {
                original: url,
                adapted: mobileUrl,
                type: 'mobile',
                reason: 'Mobile version typically has less JavaScript'
            };
        }

        // No transformation needed
        return {
            original: url,
            adapted: url,
            type: 'original',
            reason: 'URL appears Cheerio-friendly'
        };

    } catch (error) {
        console.error('[URL Adapter] Error adapting URL:', error);
        return {
            original: url,
            adapted: url,
            type: 'original',
            reason: 'Invalid URL format'
        };
    }
}

/**
 * Tries multiple URL variations and returns the first one that works
 */
export async function findWorkingUrl(url: string): Promise<UrlTransformation> {
    const axios = (await import('axios')).default;

    const variations: UrlTransformation[] = [];
    const primary = adaptUrlForCheerio(url);
    variations.push(primary);

    // Add additional fallbacks
    try {
        const urlObj = new URL(url);

        // Always try RSS variations for any site
        variations.push({
            original: url,
            adapted: `${urlObj.origin}/feed`,
            type: 'rss',
            reason: 'Standard RSS feed path'
        });

        variations.push({
            original: url,
            adapted: `${urlObj.origin}/rss`,
            type: 'rss',
            reason: 'Alternative RSS path'
        });

        // Try .rss extension
        if (!url.endsWith('.rss')) {
            variations.push({
                original: url,
                adapted: url.replace(/\/$/, '') + '.rss',
                type: 'rss',
                reason: 'RSS file extension'
            });
        }

        // Try .json extension (for Reddit-like sites)
        if (!url.endsWith('.json')) {
            variations.push({
                original: url,
                adapted: url.replace(/\/$/, '') + '.json',
                type: 'json',
                reason: 'JSON API endpoint'
            });
        }

    } catch {
        // Invalid URL, return original
    }

    // Test each variation
    for (const variation of variations) {
        try {
            const response = await axios.head(variation.adapted, {
                timeout: 5000,
                validateStatus: (status) => status < 400,
            });

            if (response.status < 400) {
                console.log(`[URL Adapter] ✓ Found working URL: ${variation.adapted} (${variation.type})`);
                return variation;
            }
        } catch {
            // This variation didn't work, try next
            continue;
        }
    }

    // If nothing worked, return the primary adaptation
    console.log(`[URL Adapter] Using primary adaptation: ${primary.adapted}`);
    return primary;
}
