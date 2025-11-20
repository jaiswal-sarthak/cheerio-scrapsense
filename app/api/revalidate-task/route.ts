/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/supabase/queries";
import { validateTask } from "@/lib/validators/task-validator";

/**
 * POST /api/revalidate-task
 * Re-validate a pending task after user edits
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { pendingTaskId, url, title, instructionText, scheduleIntervalHours } = body;

        if (!pendingTaskId || !url || !instructionText) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        console.log(`[Revalidate Task] Re-validating pending task ${pendingTaskId}`);

        // Run validation again
        const validation = await validateTask(url, instructionText);

        // Update pending task
        await db.updatePendingTask(pendingTaskId, session.user.id, {
            url,
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

        console.log(`[Revalidate Task] Updated pending task ${pendingTaskId}`);

        return NextResponse.json({
            success: true,
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
        console.error("[Revalidate Task] Error:", error);
        return NextResponse.json(
            {
                message: "Re-validation failed",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
