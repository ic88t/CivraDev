# Build Error Handling - Prevention & Detection Guide

## The Problem

When Claude generates code, build errors can occur (like invalid Tailwind CSS syntax: `hover:shadow-glow/70`). These errors break the preview and frustrate users. This guide shows how to detect, display, and automatically fix these errors.

## Solution Overview

The system now includes:

1. **Error Detection** - Backend detects build errors immediately
2. **Error Display** - Frontend shows errors with file locations and suggestions
3. **Auto-Fix Flow** - User can trigger AI to fix errors automatically
4. **Error Prevention** - Backend validation before writing files

## Architecture

```
Backend Build Error → Stream to Frontend → Display Error → User Clicks Fix → AI Fixes Error
```

## Backend Implementation

### Step 1: Detect Build Errors

After generating files, run the build/lint to detect errors:

```typescript
// After all files are written
async function detectBuildErrors(sandboxId: string) {
  try {
    // Run build in sandbox
    const buildResult = await runBuildInSandbox(sandboxId);

    if (buildResult.errors && buildResult.errors.length > 0) {
      // Parse errors and send to frontend
      const parsedErrors = buildResult.errors.map(parseError);
      return parsedErrors;
    }

    return [];
  } catch (error) {
    console.error("Build check failed:", error);
    return [];
  }
}
```

### Step 2: Parse Build Errors

Convert build output to structured errors:

```typescript
function parseError(rawError: string): BuildError {
  // Example: ./app/globals.css:41:5
  // Syntax error: The `hover:shadow-glow/70` class does not exist.

  const fileMatch = rawError.match(/(.+?):(\d+):(\d+)/);
  const messageMatch = rawError.match(/error:\s*(.+?)(?:\n|$)/i) ||
                       rawError.match(/Syntax error:\s*(.+?)(?:\n|$)/);

  return {
    file: fileMatch ? fileMatch[1] : "unknown",
    line: fileMatch ? parseInt(fileMatch[2]) : undefined,
    column: fileMatch ? parseInt(fileMatch[3]) : undefined,
    message: messageMatch ? messageMatch[1] : rawError,
    suggestion: generateSuggestion(rawError),
  };
}
```

### Step 3: Generate Error Suggestions

Provide helpful suggestions based on error type:

```typescript
function generateSuggestion(error: string): string | undefined {
  // Tailwind class errors
  if (error.includes("class does not exist")) {
    const classMatch = error.match(/`([^`]+)`/);
    const invalidClass = classMatch ? classMatch[1] : null;

    if (invalidClass?.includes("/")) {
      return `Remove the opacity modifier (/${invalidClass.split("/")[1]}) or define a custom shadow in tailwind.config.js`;
    }

    if (invalidClass?.startsWith("hover:")) {
      return "Ensure this utility class is available in your Tailwind configuration";
    }
  }

  // Import errors
  if (error.includes("Cannot find module")) {
    return "Make sure the module is installed and the import path is correct";
  }

  // TypeScript errors
  if (error.includes("Type") && error.includes("is not assignable")) {
    return "Check type definitions and ensure types match";
  }

  return undefined;
}
```

### Step 4: Stream Errors to Frontend

Send error messages via SSE:

```typescript
async function* streamGeneration(prompt: string) {
  // ... generate files ...

  yield JSON.stringify({
    type: "progress",
    message: "Running build to check for errors"
  });

  // Detect errors
  const errors = await detectBuildErrors(sandboxId);

  if (errors.length > 0) {
    // Send errors to frontend
    yield JSON.stringify({
      type: "build_error",
      errors: errors.map(e => ({
        file: e.file,
        line: e.line,
        column: e.column,
        message: e.message,
        suggestion: e.suggestion,
      }))
    });

    // Still complete, but with issues
    yield JSON.stringify({
      type: "complete",
      previewUrl: previewUrl,
      sandboxId: sandboxId,
      summary: `Project generated with ${errors.length} build error${errors.length > 1 ? 's' : ''}. Click "Ask AI to Fix Errors" to automatically resolve.`,
      issues: errors.length,
    });
  } else {
    // No errors - clean build
    yield JSON.stringify({
      type: "complete",
      previewUrl: previewUrl,
      sandboxId: sandboxId,
      summary: "Your project has been generated successfully!",
      issues: 0,
    });
  }

  yield "[DONE]";
}
```

## Frontend Display

The frontend automatically handles error display. When backend sends `build_error` messages, they appear like this:

```
┌─────────────────────────────────────────────────┐
│ ❌ Build Failed - 1 error found                 │
├─────────────────────────────────────────────────┤
│ app/globals.css:41:5                            │
│                                                 │
│ The `hover:shadow-glow/70` class does not      │
│ exist. If `hover:shadow-glow/70` is a custom   │
│ class, make sure it is defined within a        │
│ `@layer` directive.                            │
│                                                 │
│ 💡 Suggestion: Remove the opacity modifier     │
│ (/70) or define a custom shadow in             │
│ tailwind.config.js                             │
├─────────────────────────────────────────────────┤
│ [Ask AI to Fix Errors]                         │
│ The AI will automatically analyze and fix      │
│ these errors                                   │
└─────────────────────────────────────────────────┘
```

## Auto-Fix Flow

When user clicks "Ask AI to Fix Errors":

### Backend API Endpoint

```typescript
// POST /api/fix-errors
export async function POST(req: Request) {
  const { sandboxId, errors } = await req.json();

  // Create a prompt for Claude to fix the errors
  const fixPrompt = `
The following build errors occurred:

${errors.map((e, i) => `
${i + 1}. File: ${e.file}:${e.line}
   Error: ${e.message}
   ${e.suggestion ? `Suggestion: ${e.suggestion}` : ''}
`).join('\n')}

Please fix these errors by:
1. Reading the affected files
2. Identifying the root cause
3. Making the necessary corrections
4. Ensuring the fix doesn't break other functionality

Fix these errors now.
`;

  // Send to Claude Code SDK
  const stream = await claudeCode.generate(sandboxId, fixPrompt);

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

## Error Prevention Strategies

### Strategy 1: Validate CSS Before Writing

```typescript
function validateTailwindClasses(cssContent: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = cssContent.split('\n');

  lines.forEach((line, index) => {
    // Check for invalid opacity modifiers
    const invalidOpacity = line.match(/[\w-]+\/\d+/g);
    if (invalidOpacity) {
      invalidOpacity.forEach(match => {
        if (!isValidTailwindOpacity(match)) {
          errors.push({
            line: index + 1,
            message: `Invalid Tailwind class: ${match}`,
            suggestion: "Remove opacity modifier or use valid Tailwind opacity values",
          });
        }
      });
    }

    // Check for @apply with hover: modifiers
    if (line.includes('@apply') && line.includes('hover:')) {
      const hoverClasses = line.match(/hover:[\w-]+\/\d+/g);
      if (hoverClasses) {
        errors.push({
          line: index + 1,
          message: "Cannot use hover: variants inside @apply",
          suggestion: "Use regular CSS :hover pseudo-class instead",
        });
      }
    }
  });

  return errors;
}
```

### Strategy 2: Pre-Flight Checks

Add checks before writing files:

```typescript
async function writeFileWithValidation(
  filePath: string,
  content: string,
  sandboxId: string
) {
  // Validate based on file type
  if (filePath.endsWith('.css')) {
    const cssErrors = validateTailwindClasses(content);
    if (cssErrors.length > 0) {
      // Auto-fix common issues
      content = autoFixCSSIssues(content, cssErrors);
    }
  }

  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const tsErrors = await validateTypeScript(content);
    if (tsErrors.length > 0) {
      // Log for debugging but don't block
      console.warn("TypeScript validation warnings:", tsErrors);
    }
  }

  // Write file
  await writeFile(sandboxId, filePath, content);
}
```

### Strategy 3: Auto-Fix Common Issues

```typescript
function autoFixCSSIssues(content: string, errors: ValidationError[]): string {
  let fixed = content;

  // Fix 1: Remove invalid opacity modifiers from @apply
  fixed = fixed.replace(
    /@apply\s+([^;]+);/g,
    (match, classes) => {
      const cleaned = classes
        .split(/\s+/)
        .map((cls: string) => {
          // Remove opacity from utilities in @apply
          if (cls.includes('/')) {
            const [base] = cls.split('/');
            return base;
          }
          return cls;
        })
        .join(' ');
      return `@apply ${cleaned};`;
    }
  );

  // Fix 2: Replace hover: in @apply with proper CSS
  fixed = fixed.replace(
    /(@apply\s+[^}]+)(hover:[\w-]+)/g,
    (match, before, hoverClass) => {
      const className = hoverClass.replace('hover:', '');
      return `${before}\n  &:hover {\n    @apply ${className};\n  }`;
    }
  );

  return fixed;
}
```

## Complete Integration Example

### Backend Stream with Error Handling

```typescript
export async function POST(req: Request) {
  const { prompt } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Planning
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "claude_message",
            content: "I'll create your project with error prevention..."
          })}\n\n`
        ));

        // Generate files with validation
        const files = await generateFiles(prompt);

        for (const file of files) {
          // Validate before writing
          const validatedContent = await validateAndFix(file.content, file.path);

          await writeFile(sandboxId, file.path, validatedContent);

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: "tool_use",
              name: "Write",
              input: { file_path: file.path }
            })}\n\n`
          ));
        }

        // Build check
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "progress",
            message: "Running build verification"
          })}\n\n`
        ));

        const errors = await detectBuildErrors(sandboxId);

        if (errors.length > 0) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: "build_error",
              errors: errors
            })}\n\n`
          ));
        }

        // Complete
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "complete",
            previewUrl: await getPreviewUrl(sandboxId),
            sandboxId: sandboxId,
            summary: errors.length > 0
              ? `Project created with ${errors.length} issue(s) that need fixing`
              : "Project created successfully with no errors!",
            issues: errors.length
          })}\n\n`
        ));

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();

      } catch (error) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({
            type: "error",
            message: error.message
          })}\n\n`
        ));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

## Testing Error Handling

### Manual Test

1. Generate a project with intentionally broken CSS:
```css
.test {
  @apply bg-blue-500 hover:shadow-glow/70;
}
```

2. Backend should detect error and send:
```json
{
  "type": "build_error",
  "errors": [{
    "file": "app/globals.css",
    "line": 2,
    "message": "The `hover:shadow-glow/70` class does not exist",
    "suggestion": "Remove opacity modifier or define in tailwind.config.js"
  }]
}
```

3. Frontend displays error with fix button

4. User clicks fix → sends to `/api/fix-errors` → AI fixes → rebuild

## Best Practices

1. **Always run build verification** after generation
2. **Send detailed error messages** with file locations
3. **Provide actionable suggestions** for each error
4. **Auto-fix common issues** when possible
5. **Log errors for debugging** even if auto-fixed
6. **Test error handling** with intentionally broken code
7. **Make fix button prominent** so users know they can recover

## Common Error Patterns

### Tailwind CSS Errors

```
❌ hover:shadow-glow/70 in @apply
✅ Use separate :hover rule or remove opacity

❌ bg-gradient-primary (undefined)
✅ Define in tailwind.config.js first

❌ @apply rounded-lg hover:rounded-xl;
✅ Split into base class and :hover rule
```

### Import Errors

```
❌ Cannot find module '@/components/Button'
✅ Ensure file exists at that path

❌ Module not found: 'framer-motion'
✅ Add to package.json dependencies
```

### TypeScript Errors

```
❌ Property 'onClick' does not exist on type 'DivProps'
✅ Add onClick to type definition or use any

❌ Type 'string' is not assignable to type 'number'
✅ Fix type mismatch or add type conversion
```

## Summary

With this error handling system:

✅ Build errors are **detected automatically**
✅ Errors are **displayed clearly** with file locations
✅ **Suggestions help** users understand the issue
✅ **One-click fix** sends errors back to AI
✅ **Prevention strategies** reduce errors upfront
✅ **Validation** catches issues before they break
✅ **Auto-fix** resolves common problems automatically

Users will never see cryptic build errors without context or solutions!
