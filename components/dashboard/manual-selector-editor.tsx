"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    CheckCircle2,
    XCircle,
    Lightbulb,
    Copy,
    Eye,
    AlertCircle,
} from "lucide-react";

interface SelectorField {
    field: string;
    selector: string;
    attribute?: string;
}

interface ValidationResult {
    field: string;
    selector: string;
    found: boolean;
    count: number;
    samples: string[];
    error?: string;
}

interface ValidationResponse {
    success: boolean;
    containerFound?: boolean;
    results?: ValidationResult[];
    message: string;
}

interface SuggestionPatterns {
    dataTestAttributes?: string[];
    dataTestIdAttributes?: string[];
    commonClasses?: string[];
    semanticTags?: { tag: string; count: number }[];
    repeatingSelectors?: { selector: string; count: number }[];
}

interface SuggestionsResponse {
    success: boolean;
    patterns?: SuggestionPatterns;
    suggestions?: string[];
}

interface ManualSelectorEditorProps {
    url: string;
    initialSchema?: {
        selectors: SelectorField[];
    };
    onSave: (schema: { selectors: SelectorField[] }) => void;
    onCancel?: () => void;
}

export function ManualSelectorEditor({
    url,
    initialSchema,
    onSave,
    onCancel,
}: ManualSelectorEditorProps) {
    const [selectors, setSelectors] = useState<SelectorField[]>(
        initialSchema?.selectors || [
            { field: "container", selector: "" },
            { field: "title", selector: "" },
            { field: "description", selector: "" },
            { field: "url", selector: "", attribute: "href" },
        ]
    );

    const [isValidating, setIsValidating] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [validationResults, setValidationResults] = useState<ValidationResponse | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const handleSelectorChange = (index: number, field: keyof SelectorField, value: string) => {
        const updated = [...selectors];
        updated[index] = { ...updated[index], [field]: value };
        setSelectors(updated);
        setValidationResults(null); // Clear validation when editing
    };

    const addSelector = () => {
        setSelectors([...selectors, { field: "", selector: "" }]);
    };

    const removeSelector = (index: number) => {
        if (index === 0) return; // Don't remove container
        setSelectors(selectors.filter((_, i) => i !== index));
    };

    const handleValidate = async () => {
        setIsValidating(true);
        try {
            const response = await fetch("/api/validate-selectors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, selectors }),
            });

            const data = await response.json();
            setValidationResults(data);
        } catch (error) {
            console.error("Validation failed:", error);
            setValidationResults({
                success: false,
                message: "Validation failed. Please try again.",
            });
        } finally {
            setIsValidating(false);
        }
    };

    const handleGetSuggestions = async () => {
        setIsSuggesting(true);
        try {
            const response = await fetch("/api/suggest-selectors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(true);
        } catch (error) {
            console.error("Failed to get suggestions:", error);
        } finally {
            setIsSuggesting(false);
        }
    };

    const applySuggestion = (selector: string, targetFieldName?: string) => {
        const updated = [...selectors];

        // If targetFieldName is provided, find that specific field
        if (targetFieldName) {
            const index = updated.findIndex(s => s.field.toLowerCase() === targetFieldName.toLowerCase());
            if (index !== -1) {
                updated[index] = { ...updated[index], selector };
                setSelectors(updated);
                setValidationResults(null);
                return;
            }
        }

        // Smart detection: apply to the most appropriate field
        // If it looks like a container (repeating element), apply to container
        if (selector.includes('article') || selector.includes('[data-test') || selector.includes('li') ||
            selector.includes('.post') || selector.includes('.item') || selector.includes('.card')) {
            updated[0] = { ...updated[0], selector };
        } else {
            // Otherwise, find the first empty non-container field or apply to title
            const emptyIndex = updated.findIndex((s, i) => i > 0 && !s.selector);
            const targetIndex = emptyIndex !== -1 ? emptyIndex : 1; // Default to title if no empty field
            updated[targetIndex] = { ...updated[targetIndex], selector };
        }

        setSelectors(updated);
        setValidationResults(null);
    };

    const handleSave = () => {
        onSave({ selectors });
    };

    const copySchema = () => {
        navigator.clipboard.writeText(JSON.stringify({ selectors }, null, 2));
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Manual Selector Editor</CardTitle>
                            <CardDescription>
                                Define CSS selectors to extract data from {new URL(url).hostname}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGetSuggestions}
                                disabled={isSuggesting}
                            >
                                {isSuggesting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Lightbulb className="h-4 w-4" />
                                )}
                                <span className="ml-2">Get AI Suggestions</span>
                            </Button>
                            <Button variant="outline" size="sm" onClick={copySchema}>
                                <Copy className="h-4 w-4" />
                                <span className="ml-2">Copy JSON</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Selector Fields */}
                    {selectors.map((selector, index) => (
                        <div
                            key={index}
                            className="grid grid-cols-12 gap-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/50"
                        >
                            <div className="col-span-3">
                                <Label className="text-xs">Field Name</Label>
                                <Input
                                    value={selector.field}
                                    onChange={(e) =>
                                        handleSelectorChange(index, "field", e.target.value)
                                    }
                                    placeholder="e.g., title"
                                    disabled={index === 0} // Container is required
                                    className="mt-1"
                                />
                                {index === 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Required: Container for items
                                    </p>
                                )}
                            </div>
                            <div className="col-span-6">
                                <Label className="text-xs">CSS Selector</Label>
                                <Input
                                    value={selector.selector}
                                    onChange={(e) =>
                                        handleSelectorChange(index, "selector", e.target.value)
                                    }
                                    placeholder="e.g., .post-item or [data-test='post']"
                                    className="mt-1 font-mono text-sm"
                                />
                                {validationResults?.results?.[index] && (
                                    <div className="flex items-center gap-2 mt-1">
                                        {validationResults.results[index].found ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span className="text-xs text-green-600">
                                                    Found {validationResults.results[index].count} matches
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3 text-red-600" />
                                                <span className="text-xs text-red-600">
                                                    {validationResults.results[index].error || "Not found"}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs">Attribute (optional)</Label>
                                <Input
                                    value={selector.attribute || ""}
                                    onChange={(e) =>
                                        handleSelectorChange(index, "attribute", e.target.value)
                                    }
                                    placeholder="href"
                                    className="mt-1"
                                />
                            </div>
                            <div className="col-span-1 flex items-end">
                                {index > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSelector(index)}
                                        className="text-red-600"
                                    >
                                        ✕
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    <Button variant="outline" onClick={addSelector} className="w-full">
                        + Add Field
                    </Button>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button onClick={handleValidate} disabled={isValidating} className="flex-1">
                            {isValidating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Eye className="h-4 w-4 mr-2" />
                            )}
                            Test Selectors
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!validationResults?.success}
                            variant="default"
                            className="flex-1"
                        >
                            Save & Use Schema
                        </Button>
                        {onCancel && (
                            <Button variant="ghost" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                    </div>

                    {/* Validation Message */}
                    {validationResults && (
                        <div
                            className={`p-4 rounded-lg ${validationResults.success
                                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                                }`}
                        >
                            <div className="flex items-start gap-2">
                                {validationResults.success ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-medium text-sm">{validationResults.message}</p>
                                    {validationResults.results?.some((r) => r.samples?.length > 0) && (
                                        <div className="mt-2 space-y-2">
                                            <p className="text-xs font-medium">Sample Data:</p>
                                            {validationResults.results.map((r, i) => (
                                                r.samples?.length > 0 && (
                                                    <div key={i} className="text-xs">
                                                        <span className="font-mono font-semibold">{r.field}:</span>
                                                        <ul className="ml-4 mt-1 space-y-1">
                                                            {r.samples.map((sample, j) => (
                                                                <li key={j} className="text-muted-foreground">
                                                                    • {sample}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI Suggestions Panel */}
            {showSuggestions && suggestions && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">AI Suggestions</CardTitle>
                        <CardDescription>
                            Based on analysis of {new URL(url).hostname}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Contextual Suggestions */}
                        {suggestions.suggestions && suggestions.suggestions.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">💡 Smart Suggestions (click to apply)</Label>
                                <div className="space-y-2">
                                    {suggestions.suggestions.map((tip, i) => {
                                        // Extract selector from tip if it contains one
                                        const selectorMatch = tip.match(/try:\s*([^\s]+)|use:\s*([^\s]+)|selector:\s*([^\s]+)/);
                                        const extractedSelector = selectorMatch ? (selectorMatch[1] || selectorMatch[2] || selectorMatch[3]) : null;

                                        // Detect field type from tip
                                        let targetField: string | undefined;
                                        if (tip.toLowerCase().includes('container')) targetField = 'container';
                                        else if (tip.toLowerCase().includes('title')) targetField = 'title';
                                        else if (tip.toLowerCase().includes('description')) targetField = 'description';

                                        return (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="text-sm text-muted-foreground flex-1">• {tip}</span>
                                                {extractedSelector && (
                                                    <Badge
                                                        variant="outline"
                                                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
                                                        onClick={() => applySuggestion(extractedSelector, targetField)}
                                                    >
                                                        <code className="text-xs">{extractedSelector}</code>
                                                        <span className="ml-1">→ Apply</span>
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Repeating Selectors (Containers) */}
                        {suggestions.patterns?.repeatingSelectors && suggestions.patterns.repeatingSelectors.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    🔄 Potential Containers (click to apply to container)
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.patterns.repeatingSelectors.map((item, i) => (
                                        <Badge
                                            key={i}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            onClick={() => applySuggestion(item.selector, 'container')}
                                        >
                                            <code className="text-xs">{item.selector}</code>
                                            <span className="ml-2 text-xs text-muted-foreground">
                                                ({item.count})
                                            </span>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Data Test Attributes */}
                        {suggestions.patterns?.dataTestAttributes && suggestions.patterns.dataTestAttributes.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    🎯 Data-Test Attributes (click to apply to best field)
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.patterns.dataTestAttributes.map((attr, i) => {
                                        // Smart field detection based on attribute name
                                        let targetField: string | undefined;
                                        const attrLower = attr.toLowerCase();
                                        if (attrLower.includes('container') || attrLower.includes('item') || attrLower.includes('post')) {
                                            targetField = 'container';
                                        } else if (attrLower.includes('title') || attrLower.includes('name') || attrLower.includes('heading')) {
                                            targetField = 'title';
                                        } else if (attrLower.includes('desc') || attrLower.includes('content') || attrLower.includes('body')) {
                                            targetField = 'description';
                                        } else if (attrLower.includes('link') || attrLower.includes('url')) {
                                            targetField = 'url';
                                        }

                                        return (
                                            <Badge
                                                key={i}
                                                variant="secondary"
                                                className="cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                onClick={() => applySuggestion(`[data-test="${attr}"]`, targetField)}
                                            >
                                                <code className="text-xs">{attr}</code>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Common Classes */}
                        {suggestions.patterns?.commonClasses && suggestions.patterns.commonClasses.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">📦 Common Classes (click to apply)</Label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.patterns.commonClasses.slice(0, 15).map((cls, i) => {
                                        // Smart field detection based on class name
                                        let targetField: string | undefined;
                                        const clsLower = cls.toLowerCase();
                                        if (clsLower.includes('title') || clsLower.includes('heading') || clsLower.includes('name')) {
                                            targetField = 'title';
                                        } else if (clsLower.includes('desc') || clsLower.includes('content') || clsLower.includes('text')) {
                                            targetField = 'description';
                                        } else if (clsLower.includes('link') || clsLower.includes('url')) {
                                            targetField = 'url';
                                        }

                                        return (
                                            <Badge
                                                key={i}
                                                variant="outline"
                                                className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                onClick={() => applySuggestion(`.${cls}`, targetField)}
                                            >
                                                <code className="text-xs">.{cls}</code>
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
