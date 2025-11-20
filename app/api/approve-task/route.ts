
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/supabase/queries";

/**
 * POST /api/approve-task
 * Approve a pending task and move it to active tasks
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { pendingTaskId } = body;

        if (!pendingTaskId) {
            return NextResponse.json(
                { message: "Missing required field: pendingTaskId" },
                { status: 400 }
            );
        }

        console.log(`[Approve Task] Approving pending task ${pendingTaskId}`);

        // Approve the task (moves to instructions table and deletes from pending_tasks)
        const instruction = await db.approvePendingTask(pendingTaskId, session.user.id);

        console.log(`[Approve Task] Created instruction ${instruction.id}`);

        return NextResponse.json({
            success: true,
            message: "Task approved and activated",
            instructionId: instruction.id,
        });
    } catch (error) {
        console.error("[Approve Task] Error:", error);
        return NextResponse.json(
            {
                message: "Failed to approve task",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
