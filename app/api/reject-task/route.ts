
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/supabase/queries";

/**
 * DELETE /api/reject-task
 * Reject and delete a pending task
 */
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const pendingTaskId = searchParams.get("id");

        if (!pendingTaskId) {
            return NextResponse.json(
                { message: "Missing required parameter: id" },
                { status: 400 }
            );
        }

        console.log(`[Reject Task] Rejecting pending task ${pendingTaskId}`);

        // Delete the pending task
        await db.deletePendingTask(pendingTaskId, session.user.id);

        console.log(`[Reject Task] Deleted pending task ${pendingTaskId}`);

        return NextResponse.json({
            success: true,
            message: "Task rejected and deleted",
        });
    } catch (error) {
        console.error("[Reject Task] Error:", error);
        return NextResponse.json(
            {
                message: "Failed to reject task",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
