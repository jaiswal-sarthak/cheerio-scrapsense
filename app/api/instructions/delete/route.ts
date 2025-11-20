import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/supabase/queries";

export async function DELETE(request: Request) {
    console.log("[API Delete] Request received");

    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            console.log("[API Delete] No session found");
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        console.log("[API Delete] Session user:", session.user);

        const { searchParams } = new URL(request.url);
        const instructionId = searchParams.get("id");

        if (!instructionId) {
            console.log("[API Delete] No instruction ID provided");
            return NextResponse.json(
                { message: "Instruction ID is required" },
                { status: 400 }
            );
        }

        console.log(`[API Delete] Deleting instruction ${instructionId} for user ${session.user.id || session.user.email}`);

        // Use email as user ID if id is not available
        const userId = session.user.id || session.user.email;

        if (!userId) {
            console.error("[API Delete] No user ID or email found in session");
            return NextResponse.json(
                { message: "Invalid session data" },
                { status: 400 }
            );
        }

        // Delete instruction (will cascade to results and scrape_runs)
        await db.deleteInstruction(instructionId, userId);

        console.log(`[API Delete] Successfully deleted instruction ${instructionId}`);
        return NextResponse.json({ success: true, message: "Instruction deleted successfully" });
    } catch (error) {
        console.error("[API Delete] Error:", error);

        // Always return a proper JSON response
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete instruction",
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}
