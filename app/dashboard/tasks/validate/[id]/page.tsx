
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/supabase/queries";
import { TaskValidationView } from "@/components/dashboard/task-validation-view";

export default async function ValidateTaskPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    console.log("[Validate Page] Session:", JSON.stringify(session, null, 2));

    if (!session?.user) {
        console.log("[Validate Page] No session, redirecting to signin");
        redirect("/signin");
    }

    if (!session.user.id) {
        console.error("[Validate Page] Session user has no ID!", session.user);
        redirect("/signin");
    }

    // Await params for Next.js 16 compatibility
    const { id } = await params;

    console.log("[Validate Page] Loading pending task:", id, "for user:", session.user.id);

    try {
        const pendingTask = await db.getPendingTask(id, session.user.id);

        console.log("[Validate Page] Loaded pending task:", pendingTask?.id);

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Review Task</h1>
                    <p className="text-muted-foreground mt-2">
                        Review the validation results and test scrape before activating this task.
                    </p>
                </div>

                <TaskValidationView pendingTask={pendingTask} />
            </div>
        );
    } catch (error) {
        console.error("Failed to load pending task:", error);
        redirect("/dashboard/tasks");
    }
}
