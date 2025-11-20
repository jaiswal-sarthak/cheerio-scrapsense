"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle, Lightbulb, RefreshCw } from "lucide-react";

interface ValidationSuggestionsProps {
    errors: string[];
    warnings: string[];
    suggestions: string[];
    onRegenerate?: () => void;
    isRegenerating?: boolean;
}

export function ValidationSuggestions({
    errors,
    warnings,
    suggestions,
    onRegenerate,
    isRegenerating = false
}: ValidationSuggestionsProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Validation Feedback</CardTitle>
                    {errors.length > 0 && onRegenerate && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                        >
                            {isRegenerating ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Regenerate Schema
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Errors */}
                {errors.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Errors ({errors.length})
                        </h3>
                        {errors.map((error, index) => (
                            <Alert key={index} variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Warnings */}
                {warnings.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Warnings ({warnings.length})
                        </h3>
                        {warnings.map((warning, index) => (
                            <Alert key={index} className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                                    {warning}
                                </AlertDescription>
                            </Alert>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Suggestions ({suggestions.length})
                        </h3>
                        <div className="space-y-2">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="text-sm p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                                >
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
