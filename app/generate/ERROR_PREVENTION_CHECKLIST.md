# Build Error Prevention - Quick Reference

## 🚨 The Problem

**Invalid CSS like `hover:shadow-glow/70` causes build failures that break the preview.**

## ✅ The Solution

A comprehensive error detection, display, and auto-fix system.

---

## Backend Checklist

### 1. After File Generation - Run Build Check

```typescript
// After writing all files
const buildErrors = await runBuildInSandbox(sandboxId);

if (buildErrors.length > 0) {
  // Parse and send errors to frontend
  yield JSON.stringify({
    type: "build_error",
    errors: parseBuildErrors(buildErrors)
  });
}
```

### 2. Parse Errors Properly

Extract file location, message, and add suggestions:

```typescript
function parseBuildError(rawError: string) {
  return {
    file: "app/globals.css",          // Extract from error
    line: 41,                          // Extract line number
    column: 5,                         // Extract column
    message: "The `hover:shadow-glow/70` class does not exist",
    suggestion: "Remove opacity modifier or define in tailwind.config.js"
  };
}
```

### 3. Set Issues Count in Complete Message

```typescript
yield JSON.stringify({
  type: "complete",
  previewUrl: url,
  sandboxId: id,
  summary: errors.length > 0
    ? `Generated with ${errors.length} error(s) - click to fix`
    : "Generated successfully!",
  issues: errors.length  // ← This matters!
});
```

---

## Common Error Patterns

### ❌ Tailwind CSS in @apply

**Problem:**
```css
.button {
  @apply bg-blue-500 hover:shadow-glow/70;
}
```

**Why it fails:**
- Can't use `hover:` variants in `@apply`
- Opacity modifiers like `/70` on undefined utilities

**Auto-fix:**
```css
.button {
  @apply bg-blue-500;
}
.button:hover {
  @apply shadow-glow;
}
```

### ❌ Undefined Custom Classes

**Problem:**
```css
@apply bg-gradient-primary;
```

**Why it fails:**
- `gradient-primary` not defined in `tailwind.config.js`

**Fix:**
1. Define in config:
```js
theme: {
  extend: {
    backgroundImage: {
      'gradient-primary': 'linear-gradient(...)',
    }
  }
}
```

2. Or use standard Tailwind:
```css
@apply bg-gradient-to-r from-blue-500 to-purple-500;
```

---

## Message Flow with Errors

```
1. "Creating files..." (progress)
2. "Created page.tsx" (tool_use)
3. "Created globals.css" (tool_use)
4. "Running build verification" (progress)
5. BUILD ERROR DETECTED ↓

{
  "type": "build_error",
  "errors": [{
    "file": "app/globals.css",
    "line": 41,
    "message": "Invalid class",
    "suggestion": "Fix suggestion here"
  }]
}

6. "Generated with 1 error - click to fix" (complete)
```

---

## Frontend Display (Automatic)

When backend sends `build_error`, the UI automatically shows:

```
❌ Build Failed - 1 error found

┌───────────────────────────────────────┐
│ app/globals.css:41:5                  │
│                                       │
│ The `hover:shadow-glow/70` class     │
│ does not exist                        │
│                                       │
│ 💡 Remove opacity modifier or define │
│    in tailwind.config.js             │
└───────────────────────────────────────┘

⚠ 1 issue found
```

---

## Prevention Strategies

### Strategy 1: Pre-validate CSS

```typescript
function validateCSS(content: string) {
  // Check for hover: in @apply
  if (content.match(/@apply.*hover:/)) {
    return "Cannot use hover: in @apply";
  }

  // Check for undefined utilities with opacity
  if (content.match(/[\w-]+\/\d+/)) {
    return "Check opacity modifiers";
  }

  return null;
}
```

### Strategy 2: Auto-fix Common Issues

```typescript
function autoFixCSS(content: string) {
  // Remove opacity from undefined utilities
  return content.replace(
    /(@apply\s+[\w\s-]+?)([\w-]+\/\d+)/g,
    '$1$2'.replace(/\/\d+/, '')
  );
}
```

### Strategy 3: Use Validation Before Writing

```typescript
async function writeFileWithValidation(path, content) {
  if (path.endsWith('.css')) {
    const fixed = autoFixCSS(content);
    await writeFile(path, fixed);
  } else {
    await writeFile(path, content);
  }
}
```

---

## Testing

### Test with Intentionally Broken Code

```css
/* This should trigger error */
.test {
  @apply bg-blue-500 hover:shadow-xl/50;
}
```

**Expected result:**
1. Build error detected
2. Sent to frontend via `build_error` message
3. Displayed with file:line and suggestion
4. Issue count = 1 in complete message

---

## Quick Implementation

### Minimal Backend Implementation

```typescript
// After file generation
const buildResult = await exec(`cd ${sandboxPath} && npm run build`);

if (buildResult.stderr) {
  const errors = parseBuildOutput(buildResult.stderr);

  yield JSON.stringify({
    type: "build_error",
    errors: errors.map(e => ({
      file: e.file,
      line: e.line,
      message: e.message,
      suggestion: generateSuggestion(e.message)
    }))
  });
}

yield JSON.stringify({
  type: "complete",
  previewUrl: url,
  sandboxId: id,
  summary: errors.length
    ? `Generated with ${errors.length} error(s)`
    : "Generated successfully!",
  issues: errors.length
});
```

---

## Summary

### ✅ DO

- Run build after generation
- Parse errors with file locations
- Send `build_error` messages
- Set correct `issues` count in `complete`
- Add helpful suggestions
- Auto-fix common patterns

### ❌ DON'T

- Skip build verification
- Send errors without file locations
- Complete with `issues: 0` when errors exist
- Leave users stuck with cryptic errors
- Write files without validation

---

## Result

With this system:

- ✅ Build errors are detected immediately
- ✅ Errors show with exact file locations
- ✅ Suggestions help users understand issues
- ✅ Prevention reduces errors upfront
- ✅ Auto-fix resolves common problems
- ✅ Users can continue working instead of being blocked

**No more mysterious build failures!**
