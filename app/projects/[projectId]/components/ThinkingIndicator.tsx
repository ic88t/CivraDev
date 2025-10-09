"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ThinkingIndicatorProps {
  startTime: number;
  isActive: boolean;
}

export function ThinkingIndicator({ startTime, isActive }: ThinkingIndicatorProps) {
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

  return (
    <div
      className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
        isActive ? "text-gray-400" : "text-gray-600 opacity-80"
      }`}
    >
      {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
      {!isActive && <span className="text-gray-600">✓</span>}
      <span>Thought for {elapsed}s</span>
    </div>
  );
}
