import { ProgressiveMessageData } from "../components/ProgressiveMessage";
import { Task } from "../components/TaskList";
import { BuildError } from "../components/BuildErrorDisplay";

/**
 * Manages the state of a progressive message during code generation
 */
export class ProgressiveMessageManager {
  private data: ProgressiveMessageData;
  private updateCallback: (data: ProgressiveMessageData) => void;
  private buildErrors: BuildError[] = [];

  constructor(updateCallback: (data: ProgressiveMessageData) => void) {
    this.data = {
      phase: "thinking",
      thinkingStart: Date.now(),
      thinkingActive: true,
      tasks: [],
      files: [],
      buildErrors: [],
    };
    this.updateCallback = updateCallback;
  }

  /**
   * Start initial thinking phase
   */
  startThinking() {
    this.data = {
      ...this.data,
      phase: "thinking",
      thinkingStart: Date.now(),
      thinkingActive: true,
    };
    this.update();
  }

  /**
   * End thinking phase and move to planning
   */
  endThinking(planningStatement: string) {
    this.data = {
      ...this.data,
      phase: "planning",
      thinkingActive: false,
      planningStatement,
    };
    this.update();
  }

  /**
   * Add a new task
   */
  addTask(taskName: string) {
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random()}`,
      name: taskName,
      status: "active",
    };

    // Mark previous tasks as completed
    const updatedTasks = (this.data.tasks || []).map((t) => ({
      ...t,
      status: "completed" as const,
    }));

    this.data = {
      ...this.data,
      phase: "tasks",
      tasks: [...updatedTasks, newTask],
    };
    this.update();
  }

  /**
   * Complete the current task
   */
  completeCurrentTask() {
    const updatedTasks = (this.data.tasks || []).map((t, idx, arr) =>
      idx === arr.length - 1 ? { ...t, status: "completed" as const } : t
    );

    this.data = {
      ...this.data,
      tasks: updatedTasks,
    };
    this.update();
  }

  /**
   * Start building phase with project name
   */
  startBuilding(projectName: string) {
    this.data = {
      ...this.data,
      phase: "building",
      projectName,
    };
    this.update();
  }

  /**
   * Add files progressively
   */
  addFiles(files: string[]) {
    this.data = {
      ...this.data,
      phase: "files",
      files: [...(this.data.files || []), ...files],
    };
    this.update();
  }

  /**
   * Add build error
   */
  addBuildError(error: BuildError) {
    this.buildErrors.push(error);
    this.data = {
      ...this.data,
      buildErrors: [...this.buildErrors],
    };
    this.update();
  }

  /**
   * Add multiple build errors
   */
  addBuildErrors(errors: BuildError[]) {
    this.buildErrors.push(...errors);
    this.data = {
      ...this.data,
      buildErrors: [...this.buildErrors],
    };
    this.update();
  }

  /**
   * Clear build errors
   */
  clearBuildErrors() {
    this.buildErrors = [];
    this.data = {
      ...this.data,
      buildErrors: [],
    };
    this.update();
  }

  /**
   * Complete generation with summary
   */
  complete(summary: string, issues: number = 0) {
    // Auto-set issues based on build errors if not explicitly provided
    const finalIssues = this.buildErrors.length > 0 ? this.buildErrors.length : issues;

    this.data = {
      ...this.data,
      phase: "complete",
      summary,
      issues: finalIssues,
    };
    this.update();
  }

  /**
   * Get current data
   */
  getData(): ProgressiveMessageData {
    return this.data;
  }

  /**
   * Get build errors
   */
  getBuildErrors(): BuildError[] {
    return this.buildErrors;
  }

  /**
   * Trigger update callback
   */
  private update() {
    this.updateCallback({ ...this.data });
  }
}

/**
 * Parse streaming messages and determine which phase/action to trigger
 */
export function parseStreamMessage(
  message: any,
  manager: ProgressiveMessageManager
): boolean {
  if (!message || !message.type) return false;

  switch (message.type) {
    case "progress":
      // Handle progress messages (e.g., "Creating sandbox...", "Installing dependencies...")
      if (message.message) {
        manager.addTask(message.message);
      }
      return true;

    case "tool_use":
      // Handle tool usage (e.g., Write, Edit operations)
      if (message.name === "Write" || message.name === "Edit") {
        const fileName = message.input?.file_path?.split("/").pop() || "file";
        manager.addTask(`${message.name === "Write" ? "Created" : "Updated"} ${fileName}`);
      } else {
        manager.addTask(`${message.name}`);
      }
      return true;

    case "claude_message":
      // Handle Claude's planning statements
      if (message.content && !message.content.includes("<dec-code>")) {
        manager.endThinking(message.content);
      }
      return true;

    case "files_generated":
      // Handle file generation completion
      if (message.files) {
        manager.addFiles(message.files);
      }
      return true;

    case "build_error":
      // Handle build errors
      if (message.error) {
        manager.addBuildError({
          file: message.error.file || "unknown",
          line: message.error.line,
          column: message.error.column,
          message: message.error.message || "Build error occurred",
          suggestion: message.error.suggestion,
        });
      } else if (message.errors) {
        // Multiple errors
        manager.addBuildErrors(
          message.errors.map((e: any) => ({
            file: e.file || "unknown",
            line: e.line,
            column: e.column,
            message: e.message || "Build error occurred",
            suggestion: e.suggestion,
          }))
        );
      }
      return true;

    case "complete":
      // Handle completion
      const summary = message.summary || "Your project has been generated successfully!";
      manager.complete(summary, message.issues || 0);
      return true;

    default:
      return false;
  }
}
