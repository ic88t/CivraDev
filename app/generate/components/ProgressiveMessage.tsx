"use client";

import { ThinkingIndicator } from "./ThinkingIndicator";
import { TaskList, Task } from "./TaskList";
import { ProgressiveFileTree } from "./ProgressiveFileTree";
import { CompletionSummary } from "./CompletionSummary";
import { BuildErrorDisplay, BuildError } from "./BuildErrorDisplay";

export interface ProgressiveMessageData {
  phase: "thinking" | "planning" | "tasks" | "building" | "files" | "complete";
  thinkingStart?: number;
  thinkingActive?: boolean;
  planningStatement?: string;
  tasks?: Task[];
  projectName?: string;
  files?: string[];
  summary?: string;
  issues?: number;
  buildErrors?: BuildError[];
}

interface ProgressiveMessageProps {
  data: ProgressiveMessageData;
}

export function ProgressiveMessage({ data }: ProgressiveMessageProps) {
  const {
    phase,
    thinkingStart,
    thinkingActive,
    planningStatement,
    tasks,
    projectName,
    files,
    summary,
    issues,
    buildErrors,
  } = data;

  return (
    <div className="space-y-2">
      {/* Phase 1: Initial Thinking */}
      {phase !== "thinking" && thinkingStart && (
        <ThinkingIndicator
          startTime={thinkingStart}
          isActive={thinkingActive || false}
        />
      )}

      {phase === "thinking" && thinkingStart && (
        <ThinkingIndicator
          startTime={thinkingStart}
          isActive={thinkingActive || false}
        />
      )}

      {/* Phase 2: Task Planning Statement */}
      {phase !== "thinking" && planningStatement && (
        <div className="text-xs text-gray-300 my-2 leading-relaxed animate-fade-in">
          {planningStatement}
        </div>
      )}

      {/* Phase 3: Sub-Task Execution */}
      {(phase === "tasks" || phase === "building" || phase === "files" || phase === "complete") &&
        tasks &&
        tasks.length > 0 && <TaskList tasks={tasks} />}

      {/* Phase 4 & 5: Main Build + File Generation */}
      {(phase === "files" || phase === "complete") && files && files.length > 0 && (
        <ProgressiveFileTree files={files} projectName={projectName} />
      )}

      {/* Build Errors - Show if present */}
      {buildErrors && buildErrors.length > 0 && (
        <BuildErrorDisplay errors={buildErrors} />
      )}

      {/* Phase 6: Completion Summary */}
      {phase === "complete" && summary && (
        <CompletionSummary summary={summary} issues={issues} />
      )}
    </div>
  );
}
