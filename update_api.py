#!/usr/bin/env python3
"""
Script to update validate-task API to remove schemaMode parameter
"""

import re

def update_validate_task_api(file_path):
    """Remove schemaMode parameter handling from validate-task API"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Step 1: Update destructuring to remove schemaMode and manualSchema
    content = re.sub(
        r'const \{ url, title, instructionText, scheduleIntervalHours, schemaMode, manualSchema \} = body;',
        r'const { url, title, instructionText, scheduleIntervalHours } = body;',
        content
    )
    
    # Step 2: Update console.log to remove mode reference
    content = re.sub(
        r"console\.log\(`\[Validate Task\] Starting validation for \$\{url\} \(mode: \$\{schemaMode \|\| 'ai'\}\)`\);",
        r"console.log(`[Validate Task] Starting validation for ${url}`);",
        content
    )
    
    # Step 3: Remove the entire conditional block and keep only AI mode
    # Match from "let validation;" through the end of the else block
    conditional_pattern = r'        let validation;\r?\n\r?\n        if \(schemaMode === "manual" && manualSchema\) \{[^\}]*\}[^\}]*\} else \{[^\}]*validation = await validateTask\(url, instructionText\);\r?\n        \}'
    
    content = re.sub(
        conditional_pattern,
        r'        // Always use AI to generate schema\n        const validation = await validateTask(url, instructionText);',
        content,
        flags=re.DOTALL
    )
    
    # Write the modified content back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Successfully updated validate-task API")
    print("✓ Removed schemaMode parameter")
    print("✓ Always using AI schema generation")

if __name__ == "__main__":
    import sys
    
    file_path = r"c:\Users\DELL\Desktop\2343053\ScrapeSense-main\app\api\validate-task\route.ts"
    
    try:
        update_validate_task_api(file_path)
        print(f"\n✓ File updated successfully: {file_path}")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
