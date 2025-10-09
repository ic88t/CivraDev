# Backend Integration Checklist

## For: `/api/generate-daytona` and `/api/chat-civra`

This checklist ensures your backend properly integrates with the new progressive UI and error handling system.

---

## ✅ Required Message Types

Your backend MUST stream these message types via Server-Sent Events (SSE):

### 1. Planning Message
- [ ] Send `claude_message` type after initial thinking
- [ ] Include natural language explanation of what you'll do
- [ ] Example: `"I'll create a landing page with hero section..."`

```json
{
  "type": "claude_message",
  "content": "I'll help you build a web3 DeFi dashboard! Let me generate a design brief..."
}
```

### 2. Progress Updates
- [ ] Send `progress` type for setup/configuration tasks
- [ ] Use descriptive messages users can understand
- [ ] Examples: "Installing dependencies", "Setting up project structure"

```json
{
  "type": "progress",
  "message": "Installing dependencies"
}
```

### 3. File Operations
- [ ] Send `tool_use` type when creating/editing files
- [ ] Include file path in input
- [ ] UI will show as "Created filename" or "Updated filename"

```json
{
  "type": "tool_use",
  "name": "Write",
  "input": {
    "file_path": "app/page.tsx"
  }
}
```

### 4. Build Verification ⚠️ CRITICAL
- [ ] **Run build verification** after all files are written
- [ ] Detect and parse any build errors
- [ ] Send errors BEFORE the complete message

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

### 5. Completion
- [ ] Send `complete` type when generation finishes
- [ ] Include previewUrl and sandboxId
- [ ] **Set `issues` count based on detected errors**
- [ ] Update summary to mention errors if any exist

```json
{
  "type": "complete",
  "previewUrl": "https://...",
  "sandboxId": "abc123",
  "summary": "Your project has been generated successfully!",
  "issues": 0
}
```

### 6. Stream End
- [ ] Always end stream with `data: [DONE]`
- [ ] Close the stream properly

---

## 🚨 Build Error Detection (Prevents CSS Issues)

### Implementation Steps

#### Step 1: Run Build After Generation

```typescript
// After all files are written
const buildResult = await exec(`cd ${sandboxPath} && npm run build`);
```

#### Step 2: Parse Build Output

```typescript
function parseBuildErrors(stderr: string): BuildError[] {
  const errors: BuildError[] = [];
  const lines = stderr.split('\n');

  for (const line of lines) {
    // Match: ./app/globals.css:41:5
    const match = line.match(/(.+?):(\d+):(\d+)/);
    if (match) {
      const [_, file, line, column] = match;

      // Extract error message
      const messageMatch = stderr.match(/error:\s*(.+?)(?:\n|$)/i);
      const message = messageMatch ? messageMatch[1] : line;

      errors.push({
        file: file.replace('./', ''),
        line: parseInt(line),
        column: parseInt(column),
        message: message,
        suggestion: generateSuggestion(message)
      });
    }
  }

  return errors;
}
```

#### Step 3: Generate Helpful Suggestions

```typescript
function generateSuggestion(errorMessage: string): string | undefined {
  // Tailwind class errors
  if (errorMessage.includes('class does not exist')) {
    const classMatch = errorMessage.match(/`([^`]+)`/);
    if (classMatch) {
      const className = classMatch[1];

      if (className.includes('/')) {
        return 'Remove the opacity modifier or define the utility in tailwind.config.js';
      }

      if (className.startsWith('hover:')) {
        return 'Cannot use hover: variants inside @apply. Use regular CSS :hover instead';
      }

      return 'Define this custom class in tailwind.config.js or use a standard Tailwind utility';
    }
  }

  // Module not found
  if (errorMessage.includes('Cannot find module')) {
    return 'Make sure the module is installed and the import path is correct';
  }

  // TypeScript errors
  if (errorMessage.includes('Type') && errorMessage.includes('is not assignable')) {
    return 'Check type definitions and ensure types match';
  }

  return undefined;
}
```

#### Step 4: Stream Errors to Frontend

```typescript
// If errors detected
if (buildErrors.length > 0) {
  controller.enqueue(encoder.encode(
    `data: ${JSON.stringify({
      type: "build_error",
      errors: buildErrors
    })}\n\n`
  ));
}
```

---

## 📝 Complete Example

```typescript
export async function POST(req: Request) {
  const { prompt } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
      };

      try {
        // 1. Planning
        send({
          type: "claude_message",
          content: "I'll create your project with modern best practices..."
        });

        // 2. Setup
        send({ type: "progress", message: "Creating sandbox environment" });
        const sandboxId = await createSandbox();

        send({ type: "progress", message: "Installing dependencies" });
        await installDependencies(sandboxId);

        // 3. Generate files
        const files = await generateFiles(prompt, sandboxId);

        for (const file of files) {
          await writeFile(sandboxId, file.path, file.content);

          send({
            type: "tool_use",
            name: "Write",
            input: { file_path: file.path }
          });
        }

        // 4. BUILD VERIFICATION ⚠️ CRITICAL
        send({ type: "progress", message: "Running build verification" });

        const buildResult = await runBuild(sandboxId);
        const buildErrors = buildResult.errors
          ? parseBuildErrors(buildResult.stderr)
          : [];

        // 5. Send errors if found
        if (buildErrors.length > 0) {
          send({
            type: "build_error",
            errors: buildErrors
          });
        }

        // 6. Get preview URL
        const previewUrl = await getPreviewUrl(sandboxId);

        // 7. Complete
        send({
          type: "complete",
          previewUrl: previewUrl,
          sandboxId: sandboxId,
          summary: buildErrors.length > 0
            ? `Project generated with ${buildErrors.length} build error${buildErrors.length > 1 ? 's' : ''} that need fixing. Click "Ask AI to Fix Errors" to resolve automatically.`
            : "Your project has been generated successfully! Features include...",
          issues: buildErrors.length
        });

        // 8. End stream
        send("[DONE]");
        controller.close();

      } catch (error) {
        send({
          type: "error",
          message: error.message || "An error occurred"
        });
        send("[DONE]");
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

---

## 🧪 Testing Your Integration

### 1. Test Success Flow

**Input:** `"Create a simple landing page"`

**Expected Stream:**
```
data: {"type":"claude_message","content":"I'll create a landing page..."}

data: {"type":"progress","message":"Installing dependencies"}

data: {"type":"tool_use","name":"Write","input":{"file_path":"app/page.tsx"}}

data: {"type":"progress","message":"Running build verification"}

data: {"type":"complete","previewUrl":"https://...","sandboxId":"abc","summary":"Generated successfully!","issues":0}

data: [DONE]
```

### 2. Test Error Flow

**Input:** Generate code with intentional error

**Expected Stream:**
```
data: {"type":"claude_message","content":"I'll create your project..."}

data: {"type":"progress","message":"Installing dependencies"}

data: {"type":"tool_use","name":"Write","input":{"file_path":"app/globals.css"}}

data: {"type":"progress","message":"Running build verification"}

data: {"type":"build_error","errors":[{"file":"app/globals.css","line":41,"message":"The `hover:shadow-glow/70` class does not exist","suggestion":"Remove opacity modifier"}]}

data: {"type":"complete","previewUrl":"https://...","sandboxId":"abc","summary":"Generated with 1 error","issues":1}

data: [DONE]
```

---

## ⚠️ Common Mistakes

### ❌ DON'T

```typescript
// ❌ Skip build verification
send({ type: "complete", issues: 0 });

// ❌ Send errors without details
send({ type: "build_error", errors: ["Build failed"] });

// ❌ Set issues: 0 when errors exist
send({ type: "complete", issues: 0 }); // But errors were detected!

// ❌ Send errors after complete
send({ type: "complete" });
send({ type: "build_error" }); // Too late!
```

### ✅ DO

```typescript
// ✅ Run build verification
const errors = await checkBuild();

// ✅ Send detailed errors
send({
  type: "build_error",
  errors: errors.map(e => ({
    file: e.file,
    line: e.line,
    message: e.message,
    suggestion: generateSuggestion(e)
  }))
});

// ✅ Set issues count correctly
send({
  type: "complete",
  issues: errors.length
});

// ✅ Send errors BEFORE complete
if (errors.length > 0) {
  send({ type: "build_error", errors });
}
send({ type: "complete", issues: errors.length });
```

---

## 📊 Verification Checklist

Before deploying, verify:

- [ ] Messages stream in correct order
- [ ] Planning message appears first (after user prompt)
- [ ] Progress updates show for each major task
- [ ] File operations show for each Write/Edit
- [ ] **Build verification runs after all files written**
- [ ] **Build errors are detected and parsed**
- [ ] **Build errors are sent before complete message**
- [ ] **Issues count matches actual error count**
- [ ] Complete message is always last (before [DONE])
- [ ] Stream ends with [DONE]
- [ ] All messages have `data:` prefix
- [ ] Each message ends with `\n\n`

---

## 🎯 Priority Tasks

### Must Have (Blocking)
1. ✅ Stream messages as SSE
2. ✅ Send planning message
3. ✅ Send progress updates
4. ✅ Send tool_use messages
5. ✅ **Run build verification**
6. ✅ **Parse and send build errors**
7. ✅ Send complete with correct issues count

### Should Have (Important)
1. Generate helpful error suggestions
2. Parse error locations correctly
3. Validate CSS before writing
4. Auto-fix common issues

### Nice to Have (Future)
1. TypeScript error detection
2. Import/module error handling
3. Auto-fix API endpoint
4. Error analytics

---

## 📞 Questions?

Refer to these documents:

- **PROGRESSIVE_UI_GUIDE.md** - Complete backend integration guide
- **ERROR_HANDLING_GUIDE.md** - Error detection and prevention
- **ERROR_PREVENTION_CHECKLIST.md** - Quick reference
- **SYSTEM_DIAGRAM.md** - Visual architecture

---

## ✅ Sign-Off

Once you've implemented everything above:

- [ ] I have tested the success flow
- [ ] I have tested the error flow
- [ ] Build verification runs after generation
- [ ] Errors are detected and sent to frontend
- [ ] Issues count is accurate
- [ ] The CSS error (`hover:shadow-glow/70`) would now be caught
- [ ] Users see helpful error messages with suggestions
- [ ] Stream format matches examples above

**Signature:** ________________  **Date:** ________

---

**This prevents the build error you encountered from breaking the user experience!**
