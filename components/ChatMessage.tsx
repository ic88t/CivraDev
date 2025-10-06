"use client";

import React from "react";

interface ChatMessageProps {
  type: "user" | "bot" | "system";
  content: string;
  timestamp?: string;
}

export default function ChatMessage({
  type,
  content,
  timestamp,
}: ChatMessageProps) {
  const formatMessageContent = (content: string) => {
    return content.split("\n").map((line, index) => {
      if (line.startsWith("## ")) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2">
            {line.substring(3)}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={index} className="text-xl font-semibold mt-4 mb-2">
            {line.substring(2)}
          </h2>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={index} className="ml-4 list-disc">
            {line.substring(2)}
          </li>
        );
      }
      if (line.match(/^\d+\./)) {
        const match = line.match(/^(\d+\.)\s*(.*)$/);
        return (
          <li key={index} className="ml-4 list-decimal">
            {match?.[2]}
          </li>
        );
      }
      if (line.includes("**") && line.split("**").length > 2) {
        const parts = line.split("**");
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        );
      }
      return line ? (
        <p key={index} className="mb-2">
          {line}
        </p>
      ) : (
        <br key={index} />
      );
    });
  };

  if (type === "system") {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-800/50 text-gray-400 px-4 py-2 rounded-lg text-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 mb-6 ${type === "user" ? "justify-end" : ""}`}>
      {type === "bot" && (
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
      )}

      <div
        className={`flex flex-col ${type === "user" ? "items-end" : "flex-1"}`}
      >
        <div
          className={`rounded-2xl px-4 py-3 max-w-[85%] ${
            type === "user"
              ? "bg-purple-600 text-white"
              : "bg-gray-800/50 text-gray-100"
          }`}
        >
          <div className="prose prose-invert max-w-none">
            {formatMessageContent(content)}
          </div>
        </div>
        {timestamp && (
          <span className="text-xs text-gray-500 mt-1 px-1">{timestamp}</span>
        )}
      </div>

      {type === "user" && (
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">U</span>
        </div>
      )}
    </div>
  );
}
