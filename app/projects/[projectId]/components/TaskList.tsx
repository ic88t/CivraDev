"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export interface Task {
  id: string;
  name: string;
  status: "pending" | "active" | "completed";
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const [visibleTasks, setVisibleTasks] = useState<string[]>([]);

  useEffect(() => {
    tasks.forEach((task, index) => {
      setTimeout(() => {
        setVisibleTasks((prev) => [...new Set([...prev, task.id])]);
      }, index * 500); // 500ms delay between each task appearing
    });
  }, [tasks]);

  return (
    <div className="space-y-1.5 my-2">
      {tasks.map((task) => {
        const isVisible = visibleTasks.includes(task.id);

        return (
          <div
            key={task.id}
            className={`flex items-center gap-2 text-xs transition-all duration-300 ${
              !isVisible ? "opacity-0 translate-x-[-10px]" : "opacity-100 translate-x-0"
            } ${
              task.status === "active"
                ? "text-gray-400"
                : task.status === "completed"
                ? "text-gray-600"
                : "text-gray-700"
            }`}
          >
            {task.status === "active" && (
              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
            )}
            {task.status === "completed" && (
              <span className="text-green-500 flex-shrink-0 animate-checkmark">✓</span>
            )}
            {task.status === "pending" && (
              <span className="w-3 h-3 flex-shrink-0"></span>
            )}
            <span>{task.name}</span>
          </div>
        );
      })}
    </div>
  );
}
