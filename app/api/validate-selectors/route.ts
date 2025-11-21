import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * POST /api/validate-selectors
 * Test user-provided selectors against a URL
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { url, selectors } = body;

        if (!url || !selectors) {
            return NextResponse.json(
                { message: "Missing required fields: url, selectors" },
                { status: 400 }
            );
        }

        console.log(`[Validate Selectors] Testing selectors for ${url}`);

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

        // Test selectors
        const $ = cheerio.load(html);
        const results: {
            field: string;
            selector: string;
            found: boolean;
            count: number;
            samples: string[];
            error?: string;
        }[] = [];

        for (const selectorDef of selectors) {
            const { field, selector, attribute } = selectorDef;

            try {
                const elements = $(selector);
                const count = elements.length;
                const samples: string[] = [];

                // Get up to 3 sample values
                elements.slice(0, 3).each((_, el) => {
                    let value: string;
                    if (attribute) {
                        value = $(el).attr(attribute) || "";
                    } else {
                        value = $(el).text().trim();
                    }
                    if (value) {
                        samples.push(value.substring(0, 100)); // Limit length
                    }
                });

                results.push({
                    field,
                    selector,
                    found: count > 0,
                    count,
                    samples,
                });
            } catch (error) {
                results.push({
                    field,
                    selector,
                    found: false,
                    count: 0,
                    samples: [],
                    error: error instanceof Error ? error.message : "Invalid selector",
                });
            }
        }

        // Determine overall success
        const allFound = results.every(r => r.found);
        const containerFound = results.length > 0 && results[0].found;

        return NextResponse.json({
            success: allFound,
            containerFound,
            results,
            message: allFound
                ? "All selectors are valid!"
                : containerFound
                    ? "Container found, but some nested selectors failed"
                    : "Container selector not found",
        });
    } catch (error) {
        console.error("[Validate Selectors] Error:", error);
        return NextResponse.json(
            {
                message: "Validation failed",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
