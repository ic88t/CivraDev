/**
 * Chat Logger - Separates user-facing chat messages from debug logs
 *
 * - chatLog() -> User-facing messages (goes to stdout, shown in chat)
 * - debugLog() -> Internal debugging (goes to stderr, not shown in chat)
 */

export function chatLog(message: string) {
  console.log(message); // stdout - shown to user
}

export function debugLog(message: string) {
  console.error(message); // stderr - internal only
}

export function sendClaudeMessage(content: string) {
  console.log("__CLAUDE_MESSAGE__", JSON.stringify({ type: "assistant", content }));
}

export function sendToolUse(name: string, input: any) {
  console.log("__TOOL_USE__", JSON.stringify({ type: "tool_use", name, input }));
}
