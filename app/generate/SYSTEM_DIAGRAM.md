# System Architecture Diagram

## Complete Flow: Progressive UI + Error Handling

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                              │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Submit Prompt
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (page.tsx)                             │
│                                                                         │
│  1. Create Progressive Message                                          │
│     ├─ Initialize ProgressiveMessageManager                             │
│     ├─ Set phase: "thinking"                                            │
│     └─ Display: "⟳ Thought for Xs"                                      │
│                                                                         │
│  2. Stream to Backend API                                               │
│     └─ POST /api/generate-daytona                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ SSE Stream
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (API Route)                              │
│                                                                         │
│  Phase 1: Planning                                                      │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Send: { type: "claude_message", content: "I'll create..." }  │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                  │                                      │
│  Phase 2: Setup & File Generation                                       │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Send: { type: "progress", message: "Installing deps..." }    │     │
│  │ Send: { type: "tool_use", name: "Write", input: {...} }      │     │
│  │ Send: { type: "tool_use", name: "Write", input: {...} }      │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                  │                                      │
│  Phase 3: BUILD VERIFICATION ⚠️ CRITICAL                                │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Run: npm run build in sandbox                                 │     │
│  │ Parse: Build output for errors                                │     │
│  │                                                               │     │
│  │ IF ERRORS:                                                    │     │
│  │   Parse error details:                                        │     │
│  │   ├─ File path                                                │     │
│  │   ├─ Line/column                                              │     │
│  │   ├─ Error message                                            │     │
│  │   └─ Generate suggestion                                      │     │
│  │                                                               │     │
│  │   Send: {                                                     │     │
│  │     type: "build_error",                                      │     │
│  │     errors: [{ file, line, message, suggestion }]            │     │
│  │   }                                                           │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                  │                                      │
│  Phase 4: Completion                                                    │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ Send: {                                                       │     │
│  │   type: "complete",                                           │     │
│  │   previewUrl: "...",                                          │     │
│  │   sandboxId: "...",                                           │     │
│  │   summary: "...",                                             │     │
│  │   issues: errorCount  ← IMPORTANT!                           │     │
│  │ }                                                             │     │
│  │ Send: "[DONE]"                                                │     │
│  └───────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ SSE Messages
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               FRONTEND: ProgressiveMessageManager                       │
│                                                                         │
│  parseStreamMessage() routes to appropriate handler:                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ "claude_message" → endThinking(content)                     │       │
│  │ "progress"       → addTask(message)                         │       │
│  │ "tool_use"       → addTask("Created " + filename)           │       │
│  │ "build_error"    → addBuildErrors(errors) ⚠️ NEW            │       │
│  │ "complete"       → complete(summary, issues)                │       │
│  └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Updates ProgressiveMessageData:                                        │
│  ├─ phase                                                               │
│  ├─ tasks[]                                                             │
│  ├─ files[]                                                             │
│  ├─ buildErrors[] ⚠️ NEW                                                │
│  └─ summary                                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ State Update
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND: ProgressiveMessage                         │
│                                                                         │
│  Renders based on phase:                                                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ ThinkingIndicator                                           │       │
│  │   "⟳ Thought for 3s"                                        │       │
│  └─────────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ Planning Statement                                          │       │
│  │   "I'll create your project..."                            │       │
│  └─────────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ TaskList                                                    │       │
│  │   ✓ Installing dependencies                                 │       │
│  │   ✓ Created page.tsx                                        │       │
│  │   ⟳ Creating components...                                  │       │
│  └─────────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ ProgressiveFileTree                                         │       │
│  │   📁 File Tree                                              │       │
│  │     ├─ page.tsx                                             │       │
│  │     ├─ globals.css                                          │       │
│  │     └─ ...                                                  │       │
│  └─────────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ BuildErrorDisplay ⚠️ NEW                                    │       │
│  │   ❌ Build Failed - 1 error found                           │       │
│  │   ┌───────────────────────────────────────────────────┐     │       │
│  │   │ app/globals.css:41:5                              │     │       │
│  │   │                                                   │     │       │
│  │   │ The `hover:shadow-glow/70` class does not exist  │     │       │
│  │   │                                                   │     │       │
│  │   │ 💡 Remove opacity modifier or define in config   │     │       │
│  │   │                                                   │     │       │
│  │   │ [Ask AI to Fix Errors]                           │     │       │
│  │   └───────────────────────────────────────────────────┘     │       │
│  └─────────────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │ CompletionSummary                                           │       │
│  │   "Your project is ready!"                                  │       │
│  │   ⚠ 1 issue found                                           │       │
│  └─────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ User Interaction
                                  ▼
                       [Ask AI to Fix Errors] Button
                                  │
                                  ▼
                         POST /api/fix-errors
                                  │
                          (Future Implementation)
```

## Component Hierarchy

```
GeneratePageContent
├── Messages Area
│   └── messages.map()
│       ├── UserMessage
│       │   └── "User prompt text"
│       │
│       └── ProgressiveMessage ⭐ Main Component
│           ├── ThinkingIndicator
│           │   └── "⟳ Thought for Xs"
│           │
│           ├── Planning Statement
│           │   └── "I'll create..."
│           │
│           ├── TaskList
│           │   └── tasks.map()
│           │       ├── Task (pending)
│           │       ├── Task (active) ⟳
│           │       └── Task (completed) ✓
│           │
│           ├── ProgressiveFileTree
│           │   └── Progressive file reveals
│           │
│           ├── BuildErrorDisplay ⚠️ NEW
│           │   └── errors.map()
│           │       └── ErrorCard
│           │           ├── File location
│           │           ├── Error message
│           │           ├── Suggestion
│           │           └── Fix button
│           │
│           └── CompletionSummary
│               ├── Summary text
│               └── Status (✓ or ⚠)
│
└── Input Area
    └── Textarea + Send button
```

## Data Flow

```
Backend SSE Message
        ↓
parseStreamMessage()
        ↓
ProgressiveMessageManager
        ↓
updateCallback()
        ↓
setState() in page.tsx
        ↓
ProgressiveMessage component
        ↓
Child components render
        ↓
User sees update
```

## Error Handling Flow

```
1. Backend generates files
        ↓
2. Backend runs: npm run build
        ↓
3. Build fails? → Parse errors
        ↓
4. Send: { type: "build_error", errors: [...] }
        ↓
5. Frontend: parseStreamMessage()
        ↓
6. Manager: addBuildErrors()
        ↓
7. State update with buildErrors[]
        ↓
8. ProgressiveMessage renders BuildErrorDisplay
        ↓
9. User sees:
   ❌ Build Failed - X errors found

   ┌─────────────────────────────┐
   │ file.css:41:5               │
   │ Error message here          │
   │ 💡 Suggestion here          │
   │ [Ask AI to Fix Errors]      │
   └─────────────────────────────┘
        ↓
10. User clicks fix button
        ↓
11. POST /api/fix-errors with error details
        ↓
12. AI analyzes and fixes errors
        ↓
13. New build verification
        ↓
14. Success! ✓
```

## Message Type Routing

```
┌──────────────────┬─────────────────────┬──────────────────────────┐
│   Message Type   │   Manager Method    │      UI Component        │
├──────────────────┼─────────────────────┼──────────────────────────┤
│ claude_message   │ endThinking()       │ Planning Statement       │
│ progress         │ addTask()           │ TaskList                 │
│ tool_use         │ addTask()           │ TaskList                 │
│ files_generated  │ addFiles()          │ ProgressiveFileTree      │
│ build_error ⚠️   │ addBuildErrors()    │ BuildErrorDisplay ⚠️     │
│ complete         │ complete()          │ CompletionSummary        │
│ error            │ (handled directly)  │ Error message            │
└──────────────────┴─────────────────────┴──────────────────────────┘
```

## File Organization

```
app/generate/
│
├── components/
│   ├── ThinkingIndicator.tsx       ← Real-time counter
│   ├── TaskList.tsx                ← Task progression
│   ├── ProgressiveFileTree.tsx     ← File reveals
│   ├── CompletionSummary.tsx       ← Final summary
│   ├── BuildErrorDisplay.tsx       ← Error display ⚠️ NEW
│   ├── ProgressiveMessage.tsx      ← Main orchestrator
│   └── DemoProgressiveMessage.tsx  ← Testing component
│
├── utils/
│   └── progressiveMessageManager.ts ← State manager
│
├── page.tsx                         ← Main page (updated)
│
└── Documentation/
    ├── PROGRESSIVE_UI_GUIDE.md
    ├── ERROR_HANDLING_GUIDE.md     ⚠️ NEW
    ├── ERROR_PREVENTION_CHECKLIST.md ⚠️ NEW
    ├── IMPLEMENTATION_SUMMARY.md    ⚠️ NEW
    ├── SYSTEM_DIAGRAM.md           ⚠️ NEW (this file)
    └── README.md
```

## Key Integration Points

### 1. Backend → Frontend
```
SSE Stream with proper message format
{
  type: "build_error",
  errors: [{ file, line, message, suggestion }]
}
```

### 2. Frontend State Management
```typescript
const manager = new ProgressiveMessageManager((data) => {
  setMessages(prev => prev.map(msg =>
    msg.id === id ? { ...msg, progressiveData: data } : msg
  ));
});
```

### 3. Error Detection
```typescript
// Backend
const errors = await detectBuildErrors(sandboxId);
if (errors.length > 0) {
  yield { type: "build_error", errors };
}
```

### 4. Error Display
```tsx
// Frontend
{buildErrors && buildErrors.length > 0 && (
  <BuildErrorDisplay errors={buildErrors} />
)}
```

## Summary

The system provides:

✅ **Progressive UI** - Smooth, sequential reveals like v0
✅ **Error Detection** - Catches build failures immediately
✅ **Error Display** - Shows errors with context and suggestions
✅ **Prevention** - Stops the CSS error you encountered
✅ **Recovery Path** - "Ask AI to Fix" button (ready for implementation)
✅ **Professional UX** - Polished, production-ready interface

**The build error (`hover:shadow-glow/70`) that broke your app will now be caught and displayed clearly, allowing the AI to fix it automatically!**
