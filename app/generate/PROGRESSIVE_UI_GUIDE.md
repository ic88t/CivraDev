# Progressive UI Chat System - Backend Integration Guide

This guide explains how to integrate the v0-style progressive chat UI with your backend API.

## Overview

The progressive UI system creates a polished, real-time experience that shows the AI's thought process sequentially. The frontend automatically handles all animations and state management - you just need to send properly formatted messages from your backend.

## Message Flow

### Phase 1: Initial Thinking (Automatic)

When the user sends a request, the UI automatically starts showing a "Thought for Xs" indicator. No backend action needed - this happens on the frontend automatically.

### Phase 2: Planning Statement

Send a message with Claude's initial plan:

```json
{
  "type": "claude_message",
  "content": "I'll help you build a web3 DeFi dashboard! Let me generate a design brief and explore the codebase..."
}
```

**Result:** The thinking indicator completes, and the planning statement appears.

### Phase 3: Sub-Task Execution

As work progresses, send progress updates for each sub-task:

```json
{
  "type": "progress",
  "message": "Generated design brief"
}
```

```json
{
  "type": "progress",
  "message": "Explored codebase"
}
```

```json
{
  "type": "progress",
  "message": "Analyzing requirements"
}
```

**Result:** Each task appears sequentially with smooth animations. Previous tasks get checkmarks ✓.

### Phase 4 & 5: File Generation

When files are being created/updated, send tool_use messages:

```json
{
  "type": "tool_use",
  "name": "Write",
  "input": {
    "file_path": "app/page.tsx"
  }
}
```

```json
{
  "type": "tool_use",
  "name": "Edit",
  "input": {
    "file_path": "components/header.tsx"
  }
}
```

**Result:** Tasks show as "Created page.tsx", "Updated header.tsx" with smooth animations.

### Phase 6: Completion

When generation is complete, send:

```json
{
  "type": "complete",
  "previewUrl": "https://...",
  "sandboxId": "abc123",
  "summary": "Your web3 DeFi dashboard is ready! I've created a modern, dark-themed interface featuring real-time price updates, portfolio tracking, and transaction history.",
  "issues": 0
}
```

**Result:** A completion summary appears with status (green ✓ for no issues, yellow ⚠ for issues).

## Full Example Flow

Here's how your backend should stream messages:

```javascript
// 1. Initial thinking happens automatically on frontend

// 2. Send planning statement
yield {
  type: "claude_message",
  content: "I'll create a beautiful landing page with modern animations!"
}

// 3. Send progress updates as work happens
yield {
  type: "progress",
  message: "Setting up project structure"
}

yield {
  type: "progress",
  message: "Installing dependencies"
}

yield {
  type: "progress",
  message: "Configuring Tailwind CSS"
}

// 4. Send tool usage for file operations
yield {
  type: "tool_use",
  name: "Write",
  input: { file_path: "app/page.tsx" }
}

yield {
  type: "tool_use",
  name: "Write",
  input: { file_path: "app/globals.css" }
}

yield {
  type: "tool_use",
  name: "Write",
  input: { file_path: "components/hero.tsx" }
}

// 5. Complete with summary
yield {
  type: "complete",
  previewUrl: "https://preview.url",
  sandboxId: "sandbox-123",
  summary: "Your landing page is ready! Features include:\n\n• Modern hero section with gradient background\n• Smooth scroll animations\n• Responsive design for all devices\n• Optimized performance",
  issues: 0
}

// 6. Send [DONE]
yield "[DONE]"
```

## Message Type Reference

### `claude_message`
Displays Claude's planning statement or text response.
- **Fields:** `content` (string)
- **When to use:** After thinking phase, before tasks begin

### `progress`
Shows a task/progress update.
- **Fields:** `message` (string)
- **When to use:** For setup, installation, configuration steps

### `tool_use`
Indicates a file operation.
- **Fields:** `name` (string), `input` (object with `file_path`)
- **When to use:** When writing/editing files

### `complete`
Completes the generation with summary.
- **Fields:** `previewUrl`, `sandboxId`, `summary`, `issues` (optional)
- **When to use:** After all work is done

### `error`
Shows an error message.
- **Fields:** `message` (string)
- **When to use:** When something goes wrong

### `build_error`
Displays build/compilation errors with details.
- **Fields:**
  - `error` (object) - Single error: `{ file, line, column, message, suggestion }`
  - `errors` (array) - Multiple errors
- **When to use:** After detecting build failures
- **Example:**
```json
{
  "type": "build_error",
  "errors": [
    {
      "file": "app/globals.css",
      "line": 41,
      "column": 5,
      "message": "The `hover:shadow-glow/70` class does not exist",
      "suggestion": "Remove opacity modifier or define in tailwind.config.js"
    }
  ]
}
```

## Timing Recommendations

The UI automatically handles all timing and animations. You should send messages as they naturally occur in your generation process:

- **Progress updates:** Every 1-3 seconds is ideal
- **File operations:** Send immediately when files are created/updated
- **Completion:** Send immediately when generation finishes

Don't artificially delay messages - the UI handles pacing automatically with smooth animations.

## Visual States (Handled Automatically)

The UI automatically manages:
- ✓ Checkmarks for completed tasks
- ⟳ Loading indicators for active tasks
- Opacity changes for completed vs. active items
- Progressive file tree reveals (300ms between files)
- Smooth slide-in animations
- Real-time thinking counter updates

## Best Practices

1. **Be descriptive with progress messages**
   - Good: "Generated design brief"
   - Bad: "Step 1"

2. **Send planning statement early**
   - Let users know what you'll do before you do it

3. **Include meaningful summaries**
   - Highlight key features and accomplishments
   - Use bullet points for better readability

4. **Always set issues correctly**
   - `issues: 0` → Green "✓ No issues found"
   - `issues: 3` → Yellow "⚠ 3 issues found"

5. **Stream naturally**
   - Don't batch all messages at once
   - Send messages as work actually progresses

## Integration Checklist

- [ ] Backend sends `claude_message` for planning statement
- [ ] Backend sends `progress` messages for setup/configuration
- [ ] Backend sends `tool_use` messages for file operations
- [ ] **Backend runs build verification after generation**
- [ ] **Backend detects and sends `build_error` messages if build fails**
- [ ] Backend sends `complete` with summary and preview URL
- [ ] Messages are streamed as SSE with `data:` prefix
- [ ] Stream ends with `data: [DONE]`
- [ ] Error handling sends `error` type messages
- [ ] **Error count in `complete` message reflects actual issues**

## Example Backend Implementation (Node.js)

```typescript
async function* generateProject(prompt: string) {
  // Planning phase
  yield JSON.stringify({
    type: "claude_message",
    content: `I'll create ${extractProjectName(prompt)}. Let me set up the environment...`
  });

  // Setup tasks
  yield JSON.stringify({
    type: "progress",
    message: "Creating sandbox environment"
  });

  await createSandbox();

  yield JSON.stringify({
    type: "progress",
    message: "Installing dependencies"
  });

  await installDependencies();

  // File generation
  const files = await generateFiles(prompt);

  for (const file of files) {
    yield JSON.stringify({
      type: "tool_use",
      name: "Write",
      input: { file_path: file.path }
    });

    await writeFile(file.path, file.content);
  }

  // Build verification
  yield JSON.stringify({
    type: "progress",
    message: "Running build verification"
  });

  const buildErrors = await checkBuild();

  if (buildErrors.length > 0) {
    yield JSON.stringify({
      type: "build_error",
      errors: buildErrors
    });
  }

  // Completion
  const previewUrl = await getPreviewUrl();

  yield JSON.stringify({
    type: "complete",
    previewUrl,
    sandboxId: "sandbox-123",
    summary: buildErrors.length > 0
      ? `Project created with ${buildErrors.length} build error(s) that need fixing`
      : "Your project is ready! Features include...",
    issues: buildErrors.length
  });
}

// In your API route
for await (const message of generateProject(prompt)) {
  res.write(`data: ${message}\n\n`);
}
res.write(`data: [DONE]\n\n`);
res.end();
```

## Troubleshooting

**Q: Messages appear all at once instead of progressively**
A: Make sure you're streaming messages as SSE, not sending them all in one response.

**Q: Thinking indicator never stops**
A: Send a `claude_message` to end the thinking phase.

**Q: Tasks don't show checkmarks**
A: The UI automatically adds checkmarks when a new task starts. Make sure you're sending multiple progress/tool_use messages.

**Q: Files don't appear in the file tree**
A: The file tree is separate from the progressive message. It shows actual files from the sandbox.

**Q: Animations are jumpy**
A: This shouldn't happen - the UI handles timing automatically. Check that you're not sending messages too rapidly (< 100ms apart).
