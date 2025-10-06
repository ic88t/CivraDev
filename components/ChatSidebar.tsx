"use client";

import { Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import { RefObject, KeyboardEvent } from "react";

interface Message {
  id: string | number;
  type: "user" | "bot" | "system";
  content: string;
  timestamp?: string;
}

interface ChatSidebarProps {
  messages: Message[];
  inputValue: string;
  setInputValue: (value: string) => void;
  onSendMessage: () => void;
  messagesEndRef: RefObject<HTMLDivElement>;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading?: boolean;
}

export default function ChatSidebar({
  messages,
  inputValue,
  setInputValue,
  onSendMessage,
  messagesEndRef,
  textareaRef,
  onKeyDown,
  isLoading = false,
}: ChatSidebarProps) {
  return (
    <div className="w-[400px] border-r border-gray-800 flex flex-col bg-gray-950">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            type={message.type}
            content={message.content}
            timestamp={message.timestamp}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-2xl px-4 py-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1 bg-gray-800/50 rounded-2xl border border-gray-700 focus-within:border-purple-500 transition-colors">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }}
              onKeyDown={onKeyDown}
              placeholder="Ask Civra to modify your app..."
              className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 focus:outline-none resize-none max-h-32"
              rows={1}
              disabled={isLoading}
            />
          </div>

          <button
            onClick={onSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
