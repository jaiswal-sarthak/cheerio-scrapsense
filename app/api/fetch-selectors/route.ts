/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { generateExtractionSchema } from "@/lib/ai/service";

/**
 * POST /api/fetch-selectors
 * Generate AI selectors without creating a task
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { url, instructionText } = body;

        // Validate required fields
        if (!url || !instructionText) {
            return NextResponse.json(
                { message: "Missing required fields: url, instructionText" },
                { status: 400 }
            );
        }

        console.log(`[Fetch Selectors] Generating schema for ${url}`);

        // Generate AI schema
        const schema = await generateExtractionSchema(url, instructionText);

        console.log(`[Fetch Selectors] Generated schema with ${schema.selectors?.length || 0} selectors`);

        return NextResponse.json({
            success: true,
            schema: {
                selectors: schema.selectors || [],
                paginationSelector: schema.paginationSelector || "",
            },
            suggestions: [], // Can add AI suggestions here if needed
        });
    } catch (error) {
        console.error("[Fetch Selectors] Error:", error);
        return NextResponse.json(
            {
                message: "Failed to generate selectors",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
