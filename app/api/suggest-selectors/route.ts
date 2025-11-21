import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * POST /api/suggest-selectors
 * Generate AI-powered selector suggestions based on HTML analysis
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { url, instruction } = body;

        if (!url) {
            return NextResponse.json(
                { message: "Missing required field: url" },
                { status: 400 }
            );
        }

        console.log(`[Suggest Selectors] Analyzing ${url}`);

        // Fetch HTML from URL
        let html: string;
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent": process.env.SCRAPER_DEFAULT_USER_AGENT ||
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                timeout: 15000,
            });
            html = response.data;
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to fetch URL",
                    error: error instanceof Error ? error.message : "Unknown error"
                },
                { status: 400 }
            );
        }

        // Analyze HTML structure
        const $ = cheerio.load(html);

        // Find data-test attributes
        const dataTestAttributes: string[] = [];
        $('[data-test]').each((_, el) => {
            const attr = $(el).attr('data-test');
            if (attr && !dataTestAttributes.includes(attr)) {
                dataTestAttributes.push(attr);
            }
        });

        // Find data-testid attributes
        const dataTestIdAttributes: string[] = [];
        $('[data-testid]').each((_, el) => {
            const attr = $(el).attr('data-testid');
            if (attr && !dataTestIdAttributes.includes(attr)) {
                dataTestIdAttributes.push(attr);
            }
        });

        // Find common classes (appearing 3+ times)
        const classMap = new Map<string, number>();
        $('[class]').each((_, el) => {
            const classes = $(el).attr('class')?.split(' ').filter(c => c.trim()) || [];
            classes.forEach(cls => {
                classMap.set(cls, (classMap.get(cls) || 0) + 1);
            });
        });
        const commonClasses = Array.from(classMap.entries())
            .filter(([, count]) => count >= 3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([cls]) => cls);

        // Find semantic tags
        const semanticTags: { tag: string; count: number }[] = [];
        const semanticSelectors = ['article', 'section', 'main', 'aside', 'nav', 'header', 'footer'];
        semanticSelectors.forEach(tag => {
            const count = $(tag).length;
            if (count > 0) {
                semanticTags.push({ tag, count });
            }
        });

        // Find repeating structures (potential containers)
        const repeatingSelectors: { selector: string; count: number }[] = [];
        const potentialContainers = [
            'article',
            'li',
            'div[class*="item"]',
            'div[class*="card"]',
            'div[class*="post"]',
            'div[class*="product"]',
            '[data-test]',
            '[data-testid]',
        ];

        potentialContainers.forEach(selector => {
            try {
                const count = $(selector).length;
                if (count >= 2) {
                    repeatingSelectors.push({ selector, count });
                }
            } catch {
                // Invalid selector, skip
            }
        });

        // Sort by count
        repeatingSelectors.sort((a, b) => b.count - a.count);

        // Generate contextual suggestions based on URL
        const suggestions: string[] = [];
        const urlLower = url.toLowerCase();

        if (urlLower.includes('reddit.com')) {
            suggestions.push("For Reddit, try: [data-testid=\"post-container\"] for container");
            suggestions.push("Title: h3 or [slot=\"title\"]");
        } else if (urlLower.includes('news.ycombinator.com')) {
            suggestions.push("For HackerNews, try: .athing for container");
            suggestions.push("Title: .titleline > a");
        } else if (urlLower.includes('github.com')) {
            suggestions.push("For GitHub, try: article or .Box-row for container");
            suggestions.push("Title: h3 a or .h4");
        } else if (urlLower.includes('producthunt.com')) {
            suggestions.push("For Product Hunt, try: [data-test^=\"post-item-\"] for container");
            suggestions.push("Title: [data-test=\"post-name\"]");
        }

        // Add general suggestions
        if (dataTestAttributes.length > 0) {
            suggestions.push(`Found ${dataTestAttributes.length} data-test attributes - these are usually the most reliable`);
        }
        if (semanticTags.length > 0) {
            suggestions.push(`Found semantic tags: ${semanticTags.map(t => t.tag).join(', ')} - good for structure`);
        }

        return NextResponse.json({
            success: true,
            patterns: {
                dataTestAttributes: dataTestAttributes.slice(0, 15),
                dataTestIdAttributes: dataTestIdAttributes.slice(0, 15),
                commonClasses: commonClasses.slice(0, 15),
                semanticTags,
                repeatingSelectors: repeatingSelectors.slice(0, 10),
            },
            suggestions,
            instruction: instruction || null,
        });
    } catch (error) {
        console.error("[Suggest Selectors] Error:", error);
        return NextResponse.json(
            {
                message: "Failed to generate suggestions",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
