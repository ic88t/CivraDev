"use client";

import { AlertCircle, XCircle } from "lucide-react";

export interface BuildError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
}

interface BuildErrorDisplayProps {
  errors: BuildError[];
  onRetry?: () => void;
}

export function BuildErrorDisplay({ errors, onRetry }: BuildErrorDisplayProps) {
  if (errors.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      {/* Error Header */}
      <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
        <XCircle className="w-4 h-4" />
        <span>Build Failed - {errors.length} error{errors.length > 1 ? "s" : ""} found</span>
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {errors.map((error, index) => (
          <div
            key={index}
            className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 space-y-2 animate-slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* File Location */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-red-400 font-mono">
                {error.file}
                {error.line && `:${error.line}`}
                {error.column && `:${error.column}`}
              </span>
            </div>

            {/* Error Message */}
            <div className="text-xs text-gray-300 leading-relaxed">
              {error.message}
            </div>

            {/* Suggestion */}
            {error.suggestion && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-blue-950/30 border border-blue-900/50 rounded">
                <AlertCircle className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300 leading-relaxed">
                  <span className="font-medium">Suggestion: </span>
                  {error.suggestion}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Retry Button */}
      {onRetry && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onRetry}
            className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Ask AI to Fix Errors
          </button>
          <span className="text-xs text-gray-500">
            The AI will automatically analyze and fix these errors
          </span>
        </div>
      )}
    </div>
  );
}
