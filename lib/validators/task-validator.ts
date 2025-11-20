/**
 * Task validation logic
 * Validates tasks, runs test scrapes, and generates AI suggestions
 */

import { parseInstruction, type ParsedInstruction } from "@/lib/ai/instruction-parser";
import { generateSchemaFromHTML } from "@/lib/ai/service";
import { runScrapeCheerio } from "@/lib/scraper/cheerio-runner";
import { adaptUrlForCheerio } from "@/lib/scraper/url-adapter";
import axios from "axios";
import * as cheerio from "cheerio";

export interface ValidationResult {
    status: "success" | "warning" | "error";
    errors: string[];
    warnings: string[];
    suggestions: string[];
    parsedInstruction: ParsedInstruction;
    adaptedUrl?: string; // The Cheerio-friendly URL (if adapted)
    schema?: Record<string, unknown>;
    testResults?: Array<{
        title: string;
        description?: string;
        url: string;
        metadata?: Record<string, unknown>;
    }>;
    testResultCount: number;
}

/**
 * Simple HTML pattern extraction using cheerio
 */
function extractHTMLPatterns(html: string): {
    dataTestAttributes: string[];
    dataTestIdAttributes: string[];
    commonClasses: string[];
    repeatingSelectors: string[];
    semanticTags: string[];
} {
    const $ = cheerio.load(html);

    const patterns = {
        dataTestAttributes: [] as string[],
        dataTestIdAttributes: [] as string[],
        commonClasses: [] as string[],
        repeatingSelectors: [] as string[],
        semanticTags: [] as string[],
    };

    // Find data-test attributes
    $('[data-test]').each((_, el) => {
        const attr = $(el).attr('data-test');
        if (attr) patterns.dataTestAttributes.push(attr);
    });

    // Find data-testid attributes
    $('[data-testid]').each((_, el) => {
        const attr = $(el).attr('data-testid');
        if (attr) patterns.dataTestIdAttributes.push(attr);
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
        const count = $(tag).length;
        if (count > 0) {
            patterns.semanticTags.push(`${tag} (${count})`);
        }
    });

    return patterns;
}

/**
 * Validate a task and run test scrape
 */
export async function validateTask(
    url: string,
    instruction: string
): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Step 1: Parse instruction with NLP
    console.log("[Validator] Parsing instruction...");
    const parsedInstruction = parseInstruction(instruction);

    // Step 2: Validate URL
    console.log("[Validator] Validating URL...");
    const urlValidation = await validateURL(url);
    if (!urlValidation.valid) {
        errors.push(urlValidation.error!);
        return {
            status: "error",
            errors,
            warnings,
            suggestions,
            parsedInstruction,
            testResultCount: 0,
        };
    }

    // Step 3: Check instruction clarity
    if (parsedInstruction.clarity.isVague) {
        warnings.push("Instruction may be too vague. Consider being more specific.");
        suggestions.push(...parsedInstruction.clarity.missingSuggestions);
    }

    // Step 3.5: Adapt URL for Cheerio if needed
    console.log("[Validator] Checking if URL needs adaptation...");
    const urlAdaptation = adaptUrlForCheerio(url);
    let actualUrl = url;

    if (urlAdaptation.adapted !== url) {
        actualUrl = urlAdaptation.adapted;
        warnings.push(`URL adapted for better scraping: ${urlAdaptation.reason}`);
        suggestions.push(`Using ${urlAdaptation.type.toUpperCase()} version: ${actualUrl}`);
        console.log(`[Validator] ✓ URL adapted: ${url} → ${actualUrl}`);
    }

    // Step 4: Fetch and inspect HTML
    console.log("[Validator] Fetching and inspecting HTML...");
    let htmlSnippet = "";
    let patterns: {
        dataTestAttributes: string[];
        dataTestIdAttributes: string[];
        commonClasses: string[];
        repeatingSelectors: string[];
        semanticTags: string[];
    } = {
        dataTestAttributes: [],
        dataTestIdAttributes: [],
        commonClasses: [],
        repeatingSelectors: [],
        semanticTags: [],
    };

    try {
        const response = await axios.get(actualUrl, {
            headers: {
                "User-Agent": process.env.SCRAPER_DEFAULT_USER_AGENT || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 15000,
        });
        htmlSnippet = response.data;
        patterns = extractHTMLPatterns(htmlSnippet);

        // Check if we found any useful patterns
        if (
            patterns.dataTestAttributes.length === 0 &&
            patterns.dataTestIdAttributes.length === 0 &&
            patterns.commonClasses.length === 0
        ) {
            warnings.push("Page structure is complex. AI may need multiple attempts to generate accurate selectors.");
        }
    } catch (error) {
        errors.push(`Failed to fetch page: ${error instanceof Error ? error.message : "Unknown error"}`);
        return {
            status: "error",
            errors,
            warnings,
            suggestions,
            parsedInstruction,
            testResultCount: 0,
        };
    }

    // Step 5: Generate AI schema with enhanced context
    console.log("[Validator] Generating AI schema...");
    let schema: Record<string, unknown>;
    try {
        schema = await generateSchemaFromHTML({
            url,
            instruction,
            htmlSnippet,
            patterns,
        });

        // Validate schema structure
        const schemaValidation = validateSchema(schema);
        if (!schemaValidation.valid) {
            errors.push(schemaValidation.error!);
            suggestions.push("Try regenerating the schema or simplifying your instruction.");
        }
    } catch (error) {
        errors.push(`AI schema generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        return {
            status: "error",
            errors,
            warnings,
            suggestions,
            parsedInstruction,
            testResultCount: 0,
        };
    }

    // Step 6: Run test scrape with intelligent limiting
    console.log(`[Validator] Running test scrape (limit: ${parsedInstruction.resultLimit})...`);
    let testResults: Array<{
        title: string;
        description?: string;
        url: string;
        metadata?: Record<string, unknown>;
    }> = [];

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allResults = await runScrapeCheerio(actualUrl, schema as any);

        // Apply intelligent result limiting
        testResults = allResults.slice(0, parsedInstruction.resultLimit);

        if (testResults.length === 0) {
            errors.push("Test scrape returned no results. The selectors may be incorrect.");
            suggestions.push("Try one of these:");
            suggestions.push("• Simplify your instruction to focus on the main content");
            suggestions.push("• Check if the URL is correct and accessible");
            suggestions.push("• Try a different page on the same site");
        } else if (testResults.length < parsedInstruction.resultLimit && parsedInstruction.hasExplicitLimit) {
            warnings.push(
                `Found only ${testResults.length} results, but you requested ${parsedInstruction.resultLimit}. ` +
                `The page may not have enough items.`
            );
        }

        // Validate result quality
        const qualityCheck = validateResultQuality(testResults);
        if (qualityCheck.warnings.length > 0) {
            warnings.push(...qualityCheck.warnings);
        }
        if (qualityCheck.suggestions.length > 0) {
            suggestions.push(...qualityCheck.suggestions);
        }
    } catch (error) {
        errors.push(`Test scrape failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        suggestions.push("The page structure may have changed or the selectors are incorrect.");
        suggestions.push("Try clicking 'Regenerate' to create a new schema.");
    }

    // Step 7: Generate AI-powered suggestions
    if (testResults.length > 0) {
        const aiSuggestions = generateAISuggestions(parsedInstruction, testResults);
        suggestions.push(...aiSuggestions);
    }

    // Determine overall status
    let status: "success" | "warning" | "error" = "success";
    if (errors.length > 0) {
        status = "error";
    } else if (warnings.length > 0 || suggestions.length > 0) {
        status = "warning";
    }

    return {
        status,
        errors,
        warnings,
        suggestions,
        parsedInstruction,
        adaptedUrl: actualUrl !== url ? actualUrl : undefined,
        schema,
        testResults,
        testResultCount: testResults.length,
    };
}

/**
 * Validate URL format and accessibility
 */
async function validateURL(url: string): Promise<{ valid: boolean; error?: string }> {
    // Check format
    try {
        new URL(url);
    } catch {
        return {
            valid: false,
            error: "Invalid URL format. Please provide a complete URL (e.g., https://example.com)",
        };
    }

    // Check protocol
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        return {
            valid: false,
            error: "URL must start with http:// or https://",
        };
    }

    // Check accessibility (with timeout)
    try {
        await axios.head(url, {
            timeout: 5000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        return { valid: true };
    } catch {
        // Try GET if HEAD fails (some servers block HEAD requests)
        try {
            await axios.get(url, {
                timeout: 5000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                maxRedirects: 5,
            });
            return { valid: true };
        } catch {
            return {
                valid: false,
                error: "URL is not accessible. Please check if the URL is correct and the site is online.",
            };
        }
    }
}

/**
 * Validate AI-generated schema structure
 */
function validateSchema(schema: Record<string, unknown>): { valid: boolean; error?: string } {
    if (!schema.selectors || !Array.isArray(schema.selectors)) {
        return {
            valid: false,
            error: "Invalid schema: missing or invalid 'selectors' array",
        };
    }

    if (schema.selectors.length === 0) {
        return {
            valid: false,
            error: "Invalid schema: 'selectors' array is empty",
        };
    }

    // Check first selector (container)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstSelector = schema.selectors[0] as any;
    if (!firstSelector.selector) {
        return {
            valid: false,
            error: "Invalid schema: first selector missing 'selector' property",
        };
    }

    return { valid: true };
}

/**
 * Validate quality of scraped results
 */
function validateResultQuality(
    results: Array<{ title: string; description?: string; url: string; metadata?: Record<string, unknown> }>
): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for empty titles
    const emptyTitles = results.filter(r => !r.title || r.title.trim().length === 0).length;
    if (emptyTitles > results.length / 2) {
        warnings.push("More than half of the results have empty titles.");
        suggestions.push("Adjust the instruction to specify what should be used as the title.");
    }

    // Check for duplicate titles
    const titles = results.map(r => r.title);
    const uniqueTitles = new Set(titles);
    if (uniqueTitles.size < titles.length * 0.8) {
        warnings.push("Many results have duplicate titles.");
        suggestions.push("The selector may be too broad. Try being more specific.");
    }

    // Check for missing descriptions
    const missingDescriptions = results.filter(r => !r.description || r.description.trim().length === 0).length;
    if (missingDescriptions === results.length) {
        suggestions.push("Consider adding 'description' to your instruction for richer data.");
    }

    return { warnings, suggestions };
}

/**
 * Generate AI-powered suggestions based on results
 */
function generateAISuggestions(
    parsed: ParsedInstruction,
    results: Array<{ title: string; description?: string; url: string; metadata?: Record<string, unknown> }>
): string[] {
    const suggestions: string[] = [];

    // Suggest adding filters if none specified
    if (parsed.filters.length === 0 && results.length > 10) {
        suggestions.push("💡 Consider adding filters to narrow down results (e.g., 'with rating > 4')");
    }

    // Suggest sorting if not specified
    if (!parsed.sorting.order && results.length > 5) {
        suggestions.push("💡 Specify sorting preference for consistent results (e.g., 'latest posts', 'top rated')");
    }

    // Suggest specific fields if using defaults
    if (parsed.requestedFields.length <= 3) {
        suggestions.push("💡 Request specific fields for richer data (e.g., 'get title, author, date, and rating')");
    }

    // Check for HTTPS
    const hasHttp = results.some(r => r.url.startsWith("http://"));
    if (hasHttp) {
        suggestions.push("⚠️ Some URLs use HTTP instead of HTTPS. This may be a security concern.");
    }

    return suggestions;
}
