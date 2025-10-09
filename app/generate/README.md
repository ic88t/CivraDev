# Progressive Chat UI System

A v0-style progressive chat interface that shows AI's thought process and actions in real-time with smooth animations.

## 📁 File Structure

```
app/generate/
├── components/
│   ├── ThinkingIndicator.tsx       # Real-time thinking counter
│   ├── TaskList.tsx                # Sub-task list with checkmarks
│   ├── ProgressiveFileTree.tsx     # Progressive file reveal
│   ├── CompletionSummary.tsx       # Final summary with status
│   ├── BuildErrorDisplay.tsx       # Build error display component
│   ├── ProgressiveMessage.tsx      # Main orchestrator component
│   └── DemoProgressiveMessage.tsx  # Demo/test component
├── utils/
│   └── progressiveMessageManager.ts # State management utility
├── page.tsx                        # Main generate page (updated)
├── PROGRESSIVE_UI_GUIDE.md         # Backend integration guide
├── ERROR_HANDLING_GUIDE.md         # Build error handling guide
├── ERROR_PREVENTION_CHECKLIST.md   # Quick error prevention reference
└── README.md                       # This file
```

## 🎨 Features

### ✅ Implemented

- **Phase 1: Initial Thinking**
  - Real-time counter updates every second
  - Smooth loading animation
  - Automatically starts when message begins

- **Phase 2: Planning Statement**
  - Natural language explanation
  - Smooth fade-in animation
  - Previous thinking indicator shows as completed

- **Phase 3: Sub-Task Execution**
  - Sequential task appearance
  - Checkmark animation on completion
  - Active task highlighting
  - Smooth transitions between tasks

- **Phase 4: Build Announcement**
  - Project name display
  - Clear visual separator

- **Phase 5: Progressive File Tree**
  - Files appear one-by-one (300ms intervals)
  - Smooth slide-in animations
  - Hierarchical display with folder structure

- **Phase 6: Completion Summary**
  - Rich text summary with bullet points
  - Status indicator (green ✓ or yellow ⚠)
  - Issue count display

- **Build Error Detection & Display**
  - Real-time error detection after generation
  - Detailed error messages with file locations
  - Line and column numbers
  - Helpful suggestions for fixing
  - Auto-fix capability (coming soon)

### 🎬 Animations

All animations are defined in `app/globals.css`:

- **fade-in**: 300ms smooth fade
- **slide-in**: 300ms slide from left with fade
- **checkmark**: 150ms scale animation with bounce

## 🚀 Usage

### For Frontend Developers

The progressive UI is automatically integrated into `app/generate/page.tsx`. The system automatically:

1. Creates a progressive message when generation starts
2. Parses incoming stream messages
3. Updates the UI in real-time
4. Shows completion summary

No additional frontend work needed!

### For Backend Developers

Send properly formatted messages via Server-Sent Events (SSE):

```javascript
// Planning
res.write(`data: ${JSON.stringify({
  type: "claude_message",
  content: "I'll create a landing page..."
})}\n\n`);

// Progress
res.write(`data: ${JSON.stringify({
  type: "progress",
  message: "Installing dependencies"
})}\n\n`);

// File operations
res.write(`data: ${JSON.stringify({
  type: "tool_use",
  name: "Write",
  input: { file_path: "app/page.tsx" }
})}\n\n`);

// Completion
res.write(`data: ${JSON.stringify({
  type: "complete",
  previewUrl: "https://...",
  sandboxId: "abc123",
  summary: "Your project is ready!",
  issues: 0
})}\n\n`);

// End stream
res.write(`data: [DONE]\n\n`);
```

See `PROGRESSIVE_UI_GUIDE.md` for detailed backend integration instructions.

## 🧪 Testing

### Using the Demo Component

To see the progressive UI in action without backend:

```tsx
import { DemoProgressiveMessage } from "./components/DemoProgressiveMessage";

// Use in any page
<DemoProgressiveMessage />
```

The demo automatically runs through all phases with realistic timing.

### Manual Testing

1. Start your development server
2. Navigate to `/generate?prompt=test`
3. Watch the progressive UI in action as your backend streams messages

## 📊 Component API

### ProgressiveMessage

Main component that orchestrates all phases.

```tsx
<ProgressiveMessage data={progressiveData} />
```

**Props:**
- `data`: ProgressiveMessageData object with phase info

### ProgressiveMessageManager

Utility class for managing progressive message state.

```typescript
const manager = new ProgressiveMessageManager((data) => {
  // Update callback
  setMessageData(data);
});

// Use manager methods
manager.startThinking();
manager.endThinking("Planning statement");
manager.addTask("Task name");
manager.completeCurrentTask();
manager.startBuilding("Project Name");
manager.addFiles(["file1.tsx", "file2.tsx"]);
manager.complete("Summary text", 0);
```

## 🎯 Message Types

### Incoming from Backend

- `claude_message` - Planning statements
- `progress` - Task/progress updates
- `tool_use` - File operations
- `complete` - Generation complete
- `error` - Error messages

### Internal Phases

- `thinking` - Initial thinking phase
- `planning` - Planning statement shown
- `tasks` - Tasks being executed
- `building` - Building announcement
- `files` - Files being generated
- `complete` - Everything done

## 🎨 Styling

The UI uses Tailwind CSS with custom animations. All components are styled for dark mode by default:

- Background: `#0a0a0a`
- Cards: `#1a1a1a`
- Borders: `gray-800`
- Text: `gray-300` / `gray-400` / `gray-600`
- Accent: `green-500` / `yellow-500`

## 🔧 Customization

### Timing

Adjust timing in individual components:

- **ThinkingIndicator**: Update interval in `useEffect` (currently 1000ms)
- **TaskList**: Task appearance delay (currently 500ms)
- **ProgressiveFileTree**: File appearance interval (currently 300ms)

### Animations

Edit animations in `app/globals.css`:

```css
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px); /* Adjust slide distance */
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Colors

Update colors in component files or extend Tailwind config.

## 📝 Best Practices

1. **Natural Pacing**: Don't artificially delay messages - the UI handles pacing
2. **Descriptive Tasks**: Use clear, user-friendly task descriptions
3. **Rich Summaries**: Include features, highlights, and key accomplishments
4. **Error Handling**: Always set issues count correctly
5. **Stream Properly**: Send messages as they occur, not all at once

## 🐛 Troubleshooting

**Messages appear instantly instead of progressively**
- Check that backend is streaming with proper SSE format
- Verify messages have `data: ` prefix

**Thinking indicator never completes**
- Send a `claude_message` to end thinking phase

**Tasks don't animate**
- Ensure multiple task messages are sent sequentially
- Check timing between messages (should be > 100ms)

**File tree doesn't appear**
- File tree is separate from progressive message
- Check that sandbox has actual files to display

## 📚 Resources

- **PROGRESSIVE_UI_GUIDE.md** - Detailed backend integration guide
- **ERROR_HANDLING_GUIDE.md** - Complete error detection and handling guide
- **ERROR_PREVENTION_CHECKLIST.md** - Quick reference for preventing build errors
- **DemoProgressiveMessage.tsx** - Working demo for testing
- **progressiveMessageManager.ts** - State management utilities

## 🎉 Summary

You now have a fully functional v0-style progressive chat UI! The system automatically handles:

- ✓ Real-time thinking counters
- ✓ Sequential task reveals
- ✓ Smooth animations
- ✓ Progressive file trees
- ✓ Completion summaries
- ✓ Error states
- ✓ **Build error detection and display**
- ✓ **Detailed error messages with suggestions**
- ✓ **Error prevention strategies**

Just ensure your backend sends properly formatted stream messages and the UI will handle the rest!

## 🚨 Preventing Build Errors

**Important:** After generating files, your backend should:

1. **Run build verification** (`npm run build` or similar)
2. **Detect any errors** (parse stderr/build output)
3. **Send `build_error` messages** with file locations and suggestions
4. **Set correct `issues` count** in the `complete` message

See **ERROR_PREVENTION_CHECKLIST.md** for a quick implementation guide.

### Example Flow with Error Detection:

```javascript
// After file generation
const buildResult = await runBuild(sandboxId);

if (buildResult.errors.length > 0) {
  yield JSON.stringify({
    type: "build_error",
    errors: buildResult.errors.map(e => ({
      file: e.file,
      line: e.line,
      message: e.message,
      suggestion: "Fix suggestion here"
    }))
  });
}

yield JSON.stringify({
  type: "complete",
  previewUrl: url,
  sandboxId: id,
  summary: buildResult.errors.length
    ? `Generated with ${buildResult.errors.length} error(s) - needs fixing`
    : "Generated successfully!",
  issues: buildResult.errors.length
});
```

This prevents the issue you encountered where invalid CSS (`hover:shadow-glow/70`) breaks the build!
