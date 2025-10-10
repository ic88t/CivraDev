"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ThinkingIndicatorProps {
  startTime: number;
  isActive: boolean;
  thinkingContent?: string;
}

export function ThinkingIndicator({ startTime, isActive, thinkingContent }: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isActive) {
      const finalElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(finalElapsed);
      return;
    }

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isActive]);

  const hasContent = thinkingContent && thinkingContent.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Thinking Header */}
      <div
        className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
          isActive ? "text-gray-400" : "text-gray-600"
        }`}
      >
        {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
        {!isActive && <span className="text-gray-600">✓</span>}
        <span className="font-medium">Thought for {elapsed}s</span>
      </div>

      {/* Always Visible Thinking Content */}
      {hasContent && (
        <div className="pl-5 pr-3 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed animate-fade-in">
          {thinkingContent.split('\n').map((line, i) => (
            <p key={i} className={line.trim() ? "mb-2" : "mb-1"}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
