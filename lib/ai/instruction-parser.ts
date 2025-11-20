/**
 * NLP-based instruction parser
 * Extracts user intent, result limits, filters, and data requirements from natural language
 */

export interface ParsedInstruction {
    // Result limiting
    resultLimit: number; // Default 10, or user-specified
    hasExplicitLimit: boolean;
    limitKeywords: string[]; // e.g., ["top", "10"], ["first", "5"]

    // Data fields requested
    requestedFields: string[]; // e.g., ["title", "price", "rating"]

    // Filters and conditions
    filters: Array<{
        field: string;
        operator: string; // >, <, =, contains, etc.
        value: string | number;
    }>;

    // Sorting preferences
    sorting: {
        field?: string;
        order?: "asc" | "desc";
        keywords: string[]; // e.g., ["latest", "trending", "top rated"]
    };

    // Clarity assessment
    clarity: {
        score: number; // 0-100
        isVague: boolean;
        missingSuggestions: string[];
    };

    // Original instruction
    original: string;
}

/**
 * Parse natural language instruction to extract user intent
 */
export function parseInstruction(instruction: string): ParsedInstruction {
    const lower = instruction.toLowerCase();

    // Extract result limit
    const limitInfo = extractResultLimit(lower);

    // Extract requested fields
    const fields = extractRequestedFields(lower);

    // Extract filters
    const filters = extractFilters(lower);

    // Extract sorting preferences
    const sorting = extractSorting(lower);

    // Assess clarity
    const clarity = assessClarity(instruction, fields, filters);

    return {
        resultLimit: limitInfo.limit,
        hasExplicitLimit: limitInfo.hasExplicit,
        limitKeywords: limitInfo.keywords,
        requestedFields: fields,
        filters,
        sorting,
        clarity,
        original: instruction,
    };
}

/**
 * Extract result limit from instruction
 * Examples: "top 10", "first 5", "latest 20", "get 15"
 */
function extractResultLimit(instruction: string): {
    limit: number;
    hasExplicit: boolean;
    keywords: string[];
} {
    // Patterns for result limits
    const patterns = [
        /(?:top|first|latest|get|fetch|show|display)\s+(\d+)/i,
        /(\d+)\s+(?:items|results|posts|articles|products|entries)/i,
        /limit\s+(?:to\s+)?(\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = instruction.match(pattern);
        if (match) {
            const limit = parseInt(match[1], 10);
            return {
                limit: Math.min(limit, 50), // Cap at 50 for performance
                hasExplicit: true,
                keywords: match[0].split(/\s+/),
            };
        }
    }

    // Default to 10 if no explicit limit
    return {
        limit: 10,
        hasExplicit: false,
        keywords: [],
    };
}

/**
 * Extract requested data fields from instruction
 * Examples: "get title and price", "fetch name, rating, and reviews"
 */
function extractRequestedFields(instruction: string): string[] {
    const commonFields = [
        "title", "name", "heading", "headline",
        "description", "summary", "content", "text", "body",
        "price", "cost", "amount",
        "rating", "score", "stars", "reviews",
        "author", "user", "username", "poster",
        "date", "time", "timestamp", "published",
        "link", "url", "href",
        "image", "thumbnail", "photo", "picture",
        "category", "tag", "label",
        "votes", "upvotes", "likes", "points",
    ];

    const found: string[] = [];

    for (const field of commonFields) {
        // Check for exact word match (not substring)
        const regex = new RegExp(`\\b${field}s?\\b`, "i");
        if (regex.test(instruction)) {
            found.push(field);
        }
    }

    // If no specific fields mentioned, assume user wants basic info
    if (found.length === 0) {
        return ["title", "description", "link"];
    }

    return [...new Set(found)]; // Remove duplicates
}

/**
 * Extract filters and conditions from instruction
 * Examples: "price above $50", "rating > 4", "with 100+ votes"
 */
function extractFilters(instruction: string): Array<{
    field: string;
    operator: string;
    value: string | number;
}> {
    const filters: Array<{ field: string; operator: string; value: string | number }> = [];

    // Pattern: "field operator value"
    const patterns = [
        /(\w+)\s+(above|over|greater than|>)\s+(\$?\d+\.?\d*)/i,
        /(\w+)\s+(below|under|less than|<)\s+(\$?\d+\.?\d*)/i,
        /(\w+)\s+(equals?|is|=)\s+([^\s,]+)/i,
        /with\s+(\d+)\+?\s+(\w+)/i, // "with 100+ votes"
    ];

    for (const pattern of patterns) {
        const match = instruction.match(pattern);
        if (match) {
            if (pattern === patterns[3]) {
                // Special case: "with 100+ votes"
                filters.push({
                    field: match[2],
                    operator: ">",
                    value: parseInt(match[1], 10),
                });
            } else {
                const operator = normalizeOperator(match[2]);
                const value = parseValue(match[3]);
                filters.push({
                    field: match[1],
                    operator,
                    value,
                });
            }
        }
    }

    return filters;
}

/**
 * Extract sorting preferences from instruction
 * Examples: "latest posts", "top rated", "trending articles"
 */
function extractSorting(instruction: string): {
    field?: string;
    order?: "asc" | "desc";
    keywords: string[];
} {
    const sortingKeywords = {
        desc: ["latest", "newest", "recent", "top", "best", "trending", "popular", "highest"],
        asc: ["oldest", "earliest", "first", "lowest"],
    };

    const keywords: string[] = [];
    let order: "asc" | "desc" | undefined;

    // Check for descending keywords
    for (const keyword of sortingKeywords.desc) {
        if (new RegExp(`\\b${keyword}\\b`, "i").test(instruction)) {
            keywords.push(keyword);
            order = "desc";
        }
    }

    // Check for ascending keywords
    for (const keyword of sortingKeywords.asc) {
        if (new RegExp(`\\b${keyword}\\b`, "i").test(instruction)) {
            keywords.push(keyword);
            order = "asc";
        }
    }

    return {
        order,
        keywords,
    };
}

/**
 * Assess instruction clarity and completeness
 */
function assessClarity(
    instruction: string,
    fields: string[],
    filters: Array<{ field: string; operator: string; value: string | number }>
): {
    score: number;
    isVague: boolean;
    missingSuggestions: string[];
} {
    let score = 50; // Base score
    const suggestions: string[] = [];

    // Length check
    if (instruction.length < 10) {
        score -= 30;
        suggestions.push("Instruction is too short. Be more specific about what data to extract.");
    } else if (instruction.length > 200) {
        score -= 10;
        suggestions.push("Instruction is very long. Consider simplifying to key requirements.");
    } else {
        score += 10;
    }

    // Specificity check
    if (fields.length > 0) {
        score += 20;
    } else {
        suggestions.push("Specify what data fields you want (e.g., 'title', 'price', 'rating').");
    }

    // Action verb check
    const actionVerbs = ["fetch", "get", "extract", "scrape", "collect", "find", "retrieve"];
    const hasActionVerb = actionVerbs.some(verb =>
        new RegExp(`\\b${verb}\\b`, "i").test(instruction)
    );
    if (hasActionVerb) {
        score += 10;
    } else {
        suggestions.push("Start with an action verb like 'fetch', 'get', or 'extract'.");
    }

    // Filter bonus
    if (filters.length > 0) {
        score += 10;
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
        score,
        isVague: score < 60,
        missingSuggestions: suggestions,
    };
}

/**
 * Normalize operator to standard format
 */
function normalizeOperator(op: string): string {
    const normalized = op.toLowerCase();
    if (["above", "over", "greater than"].includes(normalized)) return ">";
    if (["below", "under", "less than"].includes(normalized)) return "<";
    if (["equals", "is"].includes(normalized)) return "=";
    return op;
}

/**
 * Parse value (handle numbers, currency, etc.)
 */
function parseValue(value: string): string | number {
    // Remove currency symbols
    const cleaned = value.replace(/[$€£¥]/g, "");

    // Try to parse as number
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
        return num;
    }

    return value;
}

/**
 * Generate enhanced prompt for AI schema generation
 * Includes parsed instruction metadata for better context
 */
export function generateEnhancedPrompt(
    url: string,
    instruction: string,
    parsed: ParsedInstruction
): string {
    let prompt = `Target URL: ${url}\n`;
    prompt += `User Instruction: ${instruction}\n\n`;

    prompt += `Parsed Requirements:\n`;
    prompt += `- Result Limit: ${parsed.resultLimit} items\n`;

    if (parsed.requestedFields.length > 0) {
        prompt += `- Requested Fields: ${parsed.requestedFields.join(", ")}\n`;
    }

    if (parsed.filters.length > 0) {
        prompt += `- Filters: ${parsed.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(", ")}\n`;
    }

    if (parsed.sorting.order) {
        prompt += `- Sorting: ${parsed.sorting.order === "desc" ? "Descending" : "Ascending"}`;
        if (parsed.sorting.keywords.length > 0) {
            prompt += ` (${parsed.sorting.keywords.join(", ")})`;
        }
        prompt += `\n`;
    }

    prompt += `\nGenerate a JSON schema with selectors array (field, selector, attribute?), filters, and summarize_prompt.`;
    prompt += `\nIMPORTANT: The first selector MUST be the container for each item. Prioritize data-test attributes over classes.`;

    return prompt;
}
