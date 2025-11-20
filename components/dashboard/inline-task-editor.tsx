"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X } from "lucide-react";

interface PendingTask {
    id: string;
    url: string;
    title?: string;
    instruction_text: string;
    schedule_interval_hours: number;
}

interface InlineTaskEditorProps {
    pendingTask: PendingTask;
    onCancel: () => void;
    onSaved: () => void;
}

export function InlineTaskEditor({ pendingTask, onCancel, onSaved }: InlineTaskEditorProps) {
    const router = useRouter();
    const [isRevalidating, setIsRevalidating] = useState(false);
    const [formData, setFormData] = useState({
        url: pendingTask.url,
        title: pendingTask.title || "",
        instructionText: pendingTask.instruction_text,
        scheduleIntervalHours: pendingTask.schedule_interval_hours,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsRevalidating(true);

        try {
            const response = await fetch("/api/revalidate-task", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pendingTaskId: pendingTask.id,
                    ...formData,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to revalidate task");
            }

            onSaved();
            router.refresh();
        } catch (error) {
            console.error("Failed to revalidate task:", error);
            alert("Failed to revalidate task. Please try again.");
        } finally {
            setIsRevalidating(false);
        }
    };

    return (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
                <CardTitle>Edit Task</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="url">Target URL *</Label>
                        <Input
                            id="url"
                            type="url"
                            value={formData.url}
                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://example.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Short Label (Optional)</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., HackerNews Top Stories"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instruction">Instruction *</Label>
                        <Textarea
                            id="instruction"
                            value={formData.instructionText}
                            onChange={(e) => setFormData({ ...formData, instructionText: e.target.value })}
                            placeholder="Describe what to scrape (e.g., 'Get top 10 posts with title, author, and votes')"
                            rows={4}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Be specific! Mention result limits (e.g., &quot;top 10&quot;), fields (e.g., &quot;title, price&quot;), and filters.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="schedule">Refresh Cadence (hours) *</Label>
                        <Input
                            id="schedule"
                            type="number"
                            min="1"
                            max="168"
                            value={formData.scheduleIntervalHours}
                            onChange={(e) =>
                                setFormData({ ...formData, scheduleIntervalHours: parseInt(e.target.value, 10) })
                            }
                            required
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isRevalidating}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isRevalidating}>
                            {isRevalidating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Re-validating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save & Re-validate
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
