/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { runScrapeCheerio } from "@/lib/scraper/cheerio-runner";

/**
 * POST /api/test-selectors
 * Test user-provided selectors and return live results
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { url, schema } = body;

        // Validate required fields
        if (!url || !schema) {
            return NextResponse.json(
                { message: "Missing required fields: url, schema" },
                { status: 400 }
            );
        }

        console.log(`[Test Selectors] Testing selectors for ${url}`);

        // Run scrape with provided schema
        const results = await runScrapeCheerio(url, schema);

        console.log(`[Test Selectors] Got ${results.length} results`);

        return NextResponse.json({
            success: true,
            results: results.slice(0, 5), // Return first 5 results as preview
            resultCount: results.length,
        });
    } catch (error) {
        console.error("[Test Selectors] Error:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to test selectors",
                error: error instanceof Error ? error.message : "Unknown error",
                results: [],
                resultCount: 0,
            },
            { status: 500 }
        );
    }
}
