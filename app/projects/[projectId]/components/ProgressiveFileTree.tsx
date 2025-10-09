"use client";

import { useEffect, useState } from "react";
import { File } from "lucide-react";

interface ProgressiveFileTreeProps {
  files: string[];
  projectName?: string;
}

export function ProgressiveFileTree({ files, projectName = "Project" }: ProgressiveFileTreeProps) {
  const [visibleFiles, setVisibleFiles] = useState<number>(0);

  useEffect(() => {
    if (files.length === 0) return;

    // Progressive reveal: show files one by one
    const interval = setInterval(() => {
      setVisibleFiles((prev) => {
        if (prev >= files.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 300); // 300ms between each file

    return () => clearInterval(interval);
  }, [files.length]);

  if (files.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      {/* Header */}
      <div className="text-xs font-medium text-gray-300">
        Built {projectName} v1
      </div>

      {/* File Tree */}
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-3 space-y-1">
        <div className="text-xs text-gray-500 mb-2">📁 File Tree</div>
        {files.slice(0, visibleFiles).map((file, index) => (
          <div
            key={file}
            className="flex items-center gap-2 text-xs text-gray-400 animate-slide-in"
            style={{
              animationDelay: `${index * 50}ms`,
              paddingLeft: `${(file.split("/").length - 1) * 12}px`,
            }}
          >
            <File className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span className="truncate">{file.split("/").pop()}</span>
          </div>
        ))}
        {visibleFiles < files.length && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-1 h-1 rounded-full bg-gray-600 animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-gray-600 animate-pulse delay-100"></div>
            <div className="w-1 h-1 rounded-full bg-gray-600 animate-pulse delay-200"></div>
          </div>
        )}
      </div>
    </div>
  );
}
