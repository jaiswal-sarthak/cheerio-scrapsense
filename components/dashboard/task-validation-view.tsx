"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    ThumbsUp,
    ThumbsDown,
    Edit,
    Loader2,
    RefreshCw,
    Play,
    Sliders,
} from "lucide-react";
import { ValidationSuggestions } from "./validation-suggestions";
import { InlineTaskEditor } from "./inline-task-editor";
import { TaskPreviewCard } from "./task-preview-card";
import { ManualSelectorEditor } from "./manual-selector-editor";

interface PendingTask {
    id: string;
    url: string;
    title?: string;
    instruction_text: string;
    schedule_interval_hours: number;
    validation_status: string;
    validation_errors: string[];
    validation_warnings: string[];
    ai_suggestions: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    test_results: any[];
    test_result_count: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed_instruction: any;
    created_at: string;
}

export function TaskValidationView({ pendingTask }: { pendingTask: PendingTask }) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingSelectors, setIsEditingSelectors] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [liveResults, setLiveResults] = useState<any[] | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleApprove = async () => {
        setIsApproving(true);
        try {
            const response = await fetch("/api/approve-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pendingTaskId: pendingTask.id }),
            });

            if (!response.ok) {
                throw new Error("Failed to approve task");
            }

            showMessage('success', '✓ Task approved and activated successfully!');
            setTimeout(() => {
                router.push("/dashboard?approved=true");
                router.refresh();
            }, 1500);
        } catch (error) {
            console.error("Failed to approve task:", error);
            showMessage('error', '✗ Failed to approve task. Please try again.');
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async () => {
        if (!confirm("Are you sure you want to reject this task? This cannot be undone.")) {
            return;
        }

        setIsRejecting(true);
        try {
            const response = await fetch(`/api/reject-task?id=${pendingTask.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to reject task");
            }

            showMessage('success', '✓ Task rejected successfully');
            setTimeout(() => {
                router.push("/dashboard?rejected=true");
                router.refresh();
            }, 1500);
        } catch (error) {
            console.error("Failed to reject task:", error);
            showMessage('error', '✗ Failed to reject task. Please try again.');
        } finally {
            setIsRejecting(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const response = await fetch("/api/revalidate-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pendingTaskId: pendingTask.id,
                    url: pendingTask.url,
                    title: pendingTask.title,
                    instructionText: pendingTask.instruction_text,
                    scheduleIntervalHours: pendingTask.schedule_interval_hours,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to regenerate schema");
            }

            showMessage('success', '✓ Schema regenerated successfully!');
            setTimeout(() => router.refresh(), 1000);
        } catch (error) {
            console.error("Failed to regenerate schema:", error);
            showMessage('error', '✗ Failed to regenerate schema. Please try again.');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        setLiveResults(null);
        try {
            const approveResponse = await fetch("/api/approve-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pendingTaskId: pendingTask.id }),
            });

            if (!approveResponse.ok) {
                throw new Error("Failed to prepare task for running");
            }

            const { instructionId } = await approveResponse.json();

            const scrapeResponse = await fetch("/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instructionId,
                    returnResults: true // Request results back
                }),
            });

            if (!scrapeResponse.ok) {
                throw new Error("Scrape failed");
            }

            const data = await scrapeResponse.json();
            const jobResult = data.jobs[0];

            if (jobResult.status === "failed") {
                throw new Error("Scrape job failed");
            }

            if (jobResult.data) {
                setLiveResults(jobResult.data);
                showMessage('success', `✓ Run successful! Found ${jobResult.data.length} items.`);
            } else {
                showMessage('success', '✓ Run successful! (No data returned)');
            }

        } catch (error) {
            console.error("Failed to run task:", error);
            showMessage('error', '✗ Failed to run task. Please try again.');
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusIcon = () => {
        switch (pendingTask.validation_status) {
            case "success":
                return <CheckCircle2 className="h-6 w-6 text-green-600" />;
            case "warning":
                return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
            case "error":
                return <XCircle className="h-6 w-6 text-red-600" />;
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (pendingTask.validation_status) {
            case "success":
                return "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
            case "warning":
                return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
            case "error":
                return "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
            default:
                return "";
        }
    };

    const getStatusText = () => {
        switch (pendingTask.validation_status) {
            case "success":
                return "Validation Successful";
            case "warning":
                return "Validation Passed with Warnings";
            case "error":
                return "Validation Failed";
            default:
                return "Unknown Status";
        }
    };

    // Determine if approve should be enabled
    // Enabled if: (Status is NOT error) OR (Live run was successful)
    const canApprove = pendingTask.validation_status !== "error" || (liveResults && liveResults.length > 0);

    return (
        <div className="space-y-6">
            <Card className={`border-2 ${getStatusColor()}`}>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        {getStatusIcon()}
                        <div className="flex-1">
                            <CardTitle>{getStatusText()}</CardTitle>
                            <CardDescription className="mt-1">
                                {pendingTask.validation_status === "success" && "Your task is ready to be activated!"}
                                {pendingTask.validation_status === "warning" && "Review the warnings and suggestions below."}
                                {pendingTask.validation_status === "error" && "Please fix the errors before activating."}
                            </CardDescription>
                        </div>
                        <Badge variant={pendingTask.validation_status === "success" ? "default" : "secondary"}>
                            {pendingTask.test_result_count} results found
                        </Badge>
                    </div>
                </CardHeader>
            </Card>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                    {message.text}
                </div>
            )}

            {isEditingSelectors ? (
                <ManualSelectorEditor
                    url={pendingTask.url}
                    onSave={async (schema) => {
                        try {
                            // Save the manual schema and revalidate
                            const response = await fetch("/api/revalidate-task", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    pendingTaskId: pendingTask.id,
                                    manualSchema: schema,
                                    schemaMode: "manual",
                                }),
                            });

                            if (!response.ok) {
                                throw new Error("Failed to save manual schema");
                            }

                            showMessage('success', '✓ Manual schema saved successfully!');
                            setIsEditingSelectors(false);
                            router.refresh();
                        } catch (error) {
                            console.error("Failed to save manual schema:", error);
                            showMessage('error', '✗ Failed to save manual schema. Please try again.');
                        }
                    }}
                    onCancel={() => setIsEditingSelectors(false)}
                />
            ) : isEditing ? (
                <InlineTaskEditor
                    pendingTask={pendingTask}
                    onCancel={() => setIsEditing(false)}
                    onSaved={() => {
                        setIsEditing(false);
                        router.refresh();
                    }}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Task Details</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">URL</label>
                            <p className="text-sm mt-1 font-mono break-all">{pendingTask.url}</p>
                        </div>
                        {pendingTask.title && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Title</label>
                                <p className="text-sm mt-1">{pendingTask.title}</p>
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Instruction</label>
                            <p className="text-sm mt-1">{pendingTask.instruction_text}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Schedule</label>
                            <p className="text-sm mt-1">Every {pendingTask.schedule_interval_hours} hours</p>
                        </div>
                        {pendingTask.parsed_instruction && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Parsed Intent</label>
                                <div className="text-sm mt-1 space-y-1">
                                    <p>
                                        • Result Limit: <span className="font-medium">{pendingTask.parsed_instruction.resultLimit}</span>
                                        {pendingTask.parsed_instruction.hasExplicitLimit && " (user-specified)"}
                                    </p>
                                    {pendingTask.parsed_instruction.requestedFields?.length > 0 && (
                                        <p>
                                            • Fields: <span className="font-medium">{pendingTask.parsed_instruction.requestedFields.join(", ")}</span>
                                        </p>
                                    )}
                                    {pendingTask.parsed_instruction.sorting?.order && (
                                        <p>
                                            • Sorting: <span className="font-medium">{pendingTask.parsed_instruction.sorting.order}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {(pendingTask.validation_errors.length > 0 ||
                pendingTask.validation_warnings.length > 0 ||
                pendingTask.ai_suggestions.length > 0) && (
                    <ValidationSuggestions
                        errors={pendingTask.validation_errors}
                        warnings={pendingTask.validation_warnings}
                        suggestions={pendingTask.ai_suggestions}
                        onRegenerate={handleRegenerate}
                        isRegenerating={isRegenerating}
                    />
                )}

            {/* Live Run Results */}
            {liveResults && (
                <div className="space-y-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
                    <div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Live Run Results</h2>
                        </div>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                            Successfully scraped {liveResults.length} items. You can now approve this task.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {liveResults.map((result: any, index: number) => (
                            <TaskPreviewCard key={`live-${index}`} result={result} index={index} />
                        ))}
                    </div>
                </div>
            )}

            {/* Test Results Preview (Hide if live results are shown to avoid clutter, or keep both?) */}
            {/* Keeping both for comparison, but maybe collapsed? For now, keep as is. */}
            {!liveResults && pendingTask.test_results && pendingTask.test_results.length > 0 && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold">Test Scrape Results</h2>
                        <p className="text-muted-foreground mt-1">
                            Preview of {pendingTask.test_result_count} results that will be scraped
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {pendingTask.test_results.map((result: any, index: number) => (
                            <TaskPreviewCard key={index} result={result} index={index} />
                        ))}
                    </div>
                </div>
            )}

            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-3 justify-end flex-wrap">
                        <Button
                            variant="outline"
                            onClick={handleReject}
                            disabled={isRejecting || isApproving || isRegenerating || isRunning}
                        >
                            {isRejecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <ThumbsDown className="h-4 w-4 mr-2" />
                                    Reject
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleRegenerate}
                            disabled={isRejecting || isApproving || isRegenerating || isRunning}
                        >
                            {isRegenerating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Regenerate Schema
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setIsEditingSelectors(true)}
                            disabled={isRejecting || isApproving || isRegenerating || isRunning}
                            title="Manually edit CSS selectors"
                        >
                            <Sliders className="h-4 w-4 mr-2" />
                            Modify Selectors
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            disabled={isRejecting || isApproving || isRegenerating || isRunning}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit & Re-validate
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleRun}
                            disabled={isRejecting || isApproving || isRegenerating || isRunning}
                            title="Run a live test scrape"
                        >
                            {isRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Run Now
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={handleApprove}
                            disabled={!canApprove || isRejecting || isApproving || isRegenerating || isRunning}
                            className={canApprove ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {isApproving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <ThumbsUp className="h-4 w-4 mr-2" />
                                    Approve & Activate
                                </>
                            )}
                        </Button>
                    </div>

                    {!canApprove && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-3 text-right">
                            Fix errors or run a successful test (&quot;Run Now&quot;) to enable approval.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
