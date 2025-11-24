/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/supabase/queries";
import { validateTask } from "@/lib/validators/task-validator";

/**
 * POST /api/validate-task
 * Validate a new task and run test scrape
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { url, title, instructionText, scheduleIntervalHours } = body;

        // Validate required fields
        if (!url || !instructionText) {
            return NextResponse.json(
                { message: "Missing required fields: url, instructionText" },
                { status: 400 }
            );
        }

        console.log(`[Validate Task] Starting validation for ${url}`);

        // Always use AI to generate schema
        const validation = await validateTask(url, instructionText);

        // Create pending task (use adapted URL if available)
        const pendingTask = await db.createPendingTask({
            userId: session.user.id,
            url: validation.adaptedUrl || url, // Use adapted URL if available
            title,
            instructionText,
            scheduleIntervalHours: scheduleIntervalHours || 24,
            aiGeneratedSchema: validation.schema,
            parsedInstruction: validation.parsedInstruction as any,
            validationStatus: validation.status,
            validationErrors: validation.errors,
            validationWarnings: validation.warnings,
            aiSuggestions: validation.suggestions,
            testResults: validation.testResults,
            testResultCount: validation.testResultCount,
        });

        console.log(`[Validate Task] Created pending task ${pendingTask.id}`);

        return NextResponse.json({
            success: true,
            pendingTaskId: pendingTask.id,
            validation: {
                status: validation.status,
                errors: validation.errors,
                warnings: validation.warnings,
                suggestions: validation.suggestions,
                parsedInstruction: validation.parsedInstruction,
                testResults: validation.testResults,
                testResultCount: validation.testResultCount,
            },
        });
    } catch (error) {
        console.error("[Validate Task] Error:", error);
        return NextResponse.json(
            {
                message: "Validation failed",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
