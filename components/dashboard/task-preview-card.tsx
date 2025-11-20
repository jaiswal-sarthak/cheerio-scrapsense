"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface TaskPreviewCardProps {
    result: {
        title: string;
        description?: string;
        url: string;
        metadata?: Record<string, unknown>;
    };
    index: number;
}

export function TaskPreviewCard({ result, index }: TaskPreviewCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">{result.title || "Untitled"}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                        #{index + 1}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {result.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{result.description}</p>
                )}

                {result.metadata && Object.keys(result.metadata).length > 0 && (
                    <div className="space-y-1">
                        {Object.entries(result.metadata)
                            .filter(([key]) => !["title", "description", "link", "url"].includes(key))
                            .slice(0, 3)
                            .map(([key, value]) => (
                                <div key={key} className="text-xs">
                                    <span className="font-medium text-muted-foreground">{key}: </span>
                                    <span className="text-foreground">{String(value).slice(0, 50)}</span>
                                </div>
                            ))}
                    </div>
                )}

                <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <ExternalLink className="h-3 w-3" />
                    View source
                </a>
            </CardContent>
        </Card>
    );
}
