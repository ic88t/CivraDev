"use client";

import { useEffect, useState } from "react";

interface CompletionSummaryProps {
  summary: string;
  issues?: number;
}

export function CompletionSummary({ summary, issues = 0 }: CompletionSummaryProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay appearance for smooth transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`my-3 space-y-2 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Summary Text */}
      <div className="text-xs text-gray-400 leading-relaxed">
        {summary.split("\n").map((line, i) => (
          <p key={i} className="mb-1">
            {line}
          </p>
        ))}
      </div>

      {/* Status Line */}
      <div
        className={`text-xs font-medium ${
          issues === 0 ? "text-green-500" : "text-yellow-500"
        }`}
      >
        {issues === 0 ? "✓ No issues found" : `⚠ ${issues} issue${issues > 1 ? "s" : ""} found`}
      </div>
    </div>
  );
}
