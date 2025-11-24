#!/usr/bin/env python3
"""
Script to merge AI and Manual modes in task-form.tsx
This removes the mode toggle and keeps only the unified AI-first approach
"""

import re

def merge_modes(file_path):
    """Remove schema mode toggle and related code from task-form.tsx"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Step 1: Remove unused imports
    content = re.sub(
        r'import \{ CheckCircle2, Loader2, Newspaper, MessageSquare, Code, Wand2, Settings2 \} from "lucide-react";',
        r'import { CheckCircle2, Loader2, Newspaper, MessageSquare, Code } from "lucide-react";',
        content
    )
    
    content = re.sub(
        r'import \{ Badge \} from "@/components/ui/badge";\r?\n',
        '',
        content
    )
    
    content = re.sub(
        r'import \{ ManualSelectorEditor \} from "@/components/dashboard/manual-selector-editor";\r?\n',
        '',
        content
    )
    
    # Step 2: Remove SchemaMode type
    content = re.sub(
        r'type SchemaMode = "ai" \| "manual";\r?\n\r?\n',
        '',
        content
    )
    
    # Step 3: Remove state variables (schemaMode and manualSchema)
    content = re.sub(
        r'  const \[schemaMode, setSchemaMode\] = useState<SchemaMode>\("ai"\);\r?\n  const \[manualSchema, setManualSchema\] = useState<any>\(null\);\r?\n',
        '',
        content
    )
    
    # Step 4: Remove the Schema Mode Toggle section (lines 164-207)
    # This is the entire section from "Schema Mode Toggle" comment to the closing </div>
    schema_toggle_pattern = r'      \{/\* Schema Mode Toggle \*/\}\r?\n      <div className="space-y-3">.*?      </div>\r?\n\r?\n'
    content = re.sub(schema_toggle_pattern, '', content, flags=re.DOTALL)
    
    # Step 5: Update the divider text (remove conditional and quotes)
    content = re.sub(
        r'\{schemaMode === "ai" \? "Or enter custom site" : "Enter site details"\}',
        r'Or enter custom site',
        content
    )
    
    # Step 6: Remove schemaMode and manualSchema from API call
    content = re.sub(
        r'          schemaMode,\r?\n          manualSchema: schemaMode === "manual" \? manualSchema : undefined,\r?\n',
        '',
        content
    )
    
    # Step 7: Remove the Manual Selector Editor conditional section
    manual_editor_pattern = r'        \{/\* Manual Selector Editor \*/\}\r?\n        \{schemaMode === "manual" && currentUrl && \(\r?\n          <div className="space-y-2">.*?        \)\}\r?\n\r?\n'
    content = re.sub(manual_editor_pattern, '', content, flags=re.DOTALL)
    
    # Step 8: Simplify the submit button (remove schema mode check)
    content = re.sub(
        r'disabled=\{isSubmitting \|\| \(schemaMode === "manual" && !manualSchema\)\}',
        r'disabled={isSubmitting}',
        content
    )
    
    # Write the modified content back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Successfully merged AI and Manual modes")
    print("✓ Removed schema mode toggle")
    print("✓ Removed unused imports and state")
    print("✓ Simplified API call")
    print("✓ Removed conditional manual editor")

if __name__ == "__main__":
    import sys
    
    file_path = r"c:\Users\DELL\Desktop\2343053\ScrapeSense-main\components\dashboard\task-form.tsx"
    
    try:
        merge_modes(file_path)
        print(f"\n✓ File updated successfully: {file_path}")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
