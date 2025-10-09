"use client";

import { useState, useEffect, useRef, Suspense, KeyboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { Send, Loader2, Code2, Eye, Download, Rocket, Sparkles, ArrowLeft, Copy, RotateCcw, MoreVertical } from "lucide-react";
import { ProgressiveMessage, ProgressiveMessageData } from "./components/ProgressiveMessage";
import { ProgressiveMessageManager, parseStreamMessage } from "./utils/progressiveMessageManager";
import { Sidebar } from "./components/Sidebar";

interface Message {
  id: string | number;
  type: "user" | "bot" | "system" | "assistant" | "progressive";
  content: string;
  timestamp?: string;
  progressiveData?: ProgressiveMessageData;
}

function GeneratePageV0Content() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prompt = searchParams.get("prompt") || "";
  const continueSandboxId = searchParams.get("sandboxId");
  const isContinuing = searchParams.get("continue") === "true";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [activeTab, setActiveTab] = useState("chat");
  const [projectName, setProjectName] = useState("New Project");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasStartedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isContinuing && continueSandboxId) {
      setSandboxId(continueSandboxId);
      setGenerationCompleted(true);
      loadChatHistory(continueSandboxId);
      fetchPreviewUrl(continueSandboxId);
      return;
    }

    if (!prompt) {
      router.push("/");
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Extract project name from prompt
    const nameMatch = prompt.match(/(?:make|create|build)\s+(?:a|an|me)?\s*(.+?)(?:\s+(?:with|that|using)|\s*$)/i);
    if (nameMatch) {
      setProjectName(nameMatch[1].trim());
    }

    setMessages([
      {
        id: 1,
        type: "user",
        content: prompt,
        timestamp: new Date().toLocaleString(),
      },
    ]);

    setIsGenerating(true);
    generateWebsite();
  }, [prompt, router, isContinuing, continueSandboxId]);

  const loadChatHistory = async (sandboxId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const messagesResponse = await fetch(`/api/projects/messages?sandboxId=${sandboxId}`, {
        headers: authHeaders,
      });

      if (messagesResponse.ok) {
        const { messages: chatHistory } = await messagesResponse.json();

        if (chatHistory && chatHistory.length > 0) {
          const formattedMessages = chatHistory.map((msg: any, index: number) => {
            let cleanContent = msg.content;

            if (cleanContent.includes('<dec-code>')) {
              const beforeCode = cleanContent.match(/^([\s\S]*?)<dec-code>/)?.[1]?.trim() || '';
              const afterCode = cleanContent.match(/<\/dec-code>([\s\S]*)$/)?.[1]?.trim() || '';
              cleanContent = [beforeCode, afterCode].filter(Boolean).join('\n\n');
            }

            return {
              id: msg.id || index,
              type: msg.role,
              content: cleanContent,
              timestamp: new Date(msg.created_at).toLocaleString(),
            };
          });

          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    }
  };

  const fetchPreviewUrl = async (sandboxId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/projects/preview?id=${sandboxId}`, {
        headers: authHeaders,
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.previewUrl);
      }
    } catch (error) {
      console.error("Failed to fetch preview URL:", error);
    }
  };

  const generateWebsite = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const progressiveMessageId = Date.now();
      let progressiveManager: ProgressiveMessageManager | null = null;

      setMessages((prev) => [
        ...prev,
        {
          id: progressiveMessageId,
          type: "progressive",
          content: "",
          timestamp: new Date().toLocaleString(),
          progressiveData: {
            phase: "thinking",
            thinkingStart: Date.now(),
            thinkingActive: true,
            tasks: [],
            files: [],
          },
        },
      ]);

      progressiveManager = new ProgressiveMessageManager((data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === progressiveMessageId
              ? { ...msg, progressiveData: data }
              : msg
          )
        );
      });

      const response = await fetch("/api/generate-daytona", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate website");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              setIsGenerating(false);
              if (!generationCompleted) setGenerationCompleted(true);
              break;
            }

            try {
              const message = JSON.parse(data);

              if (progressiveManager) {
                parseStreamMessage(message, progressiveManager);
              }

              if (message.type === "error") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "system",
                  content: `Error: ${message.message}`,
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "complete") {
                setPreviewUrl(message.previewUrl || null);
                setSandboxId(message.sandboxId || null);
                setGenerationCompleted(true);
                setIsGenerating(false);

                if (progressiveManager) {
                  progressiveManager.complete(
                    "Your project has been generated successfully! I've created a modern, responsive interface with all the features you requested.",
                    0
                  );
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error generating website:", err);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        type: "system",
        content: `Error: ${err.message || "An error occurred"}`,
        timestamp: new Date().toLocaleString(),
      }]);
      setIsGenerating(false);
    }
  };

  const sendFollowUpPrompt = async () => {
    if (!inputValue.trim() || isGenerating || !sandboxId) return;

    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date().toLocaleString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const conversationHistory = messages
        .filter((msg) => msg.type === "user" || msg.type === "bot")
        .map((msg) => ({
          role: msg.type === "user" ? "user" : "assistant",
          content: msg.content,
        }));

      const progressiveMessageId = Date.now();
      let progressiveManager: ProgressiveMessageManager | null = null;

      setMessages((prev) => [
        ...prev,
        {
          id: progressiveMessageId,
          type: "progressive",
          content: "",
          timestamp: new Date().toLocaleString(),
          progressiveData: {
            phase: "thinking",
            thinkingStart: Date.now(),
            thinkingActive: true,
            tasks: [],
            files: [],
          },
        },
      ]);

      progressiveManager = new ProgressiveMessageManager((data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === progressiveMessageId
              ? { ...msg, progressiveData: data }
              : msg
          )
        );
      });

      const response = await fetch("/api/chat-civra", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          sandboxId: sandboxId,
          message: inputValue,
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) throw new Error("Failed to process follow-up");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsGenerating(false);
              break;
            }

            try {
              const message = JSON.parse(data);

              if (progressiveManager) {
                parseStreamMessage(message, progressiveManager);
              }

              if (message.type === "error") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "system",
                  content: `Error: ${message.content}`,
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "complete") {
                if (message.previewUrl) setPreviewUrl(message.previewUrl);
                setIsGenerating(false);

                if (progressiveManager) {
                  progressiveManager.complete(
                    "Changes have been applied successfully!",
                    0
                  );
                }
              }
            } catch (parseError) {
              // Ignore
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error sending follow-up:", err);
      setMessages((prev) => [...prev, {
        id: Date.now(),
        type: "system",
        content: `Error: ${err.message || "An error occurred"}`,
        timestamp: new Date().toLocaleString(),
      }]);
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (generationCompleted) sendFollowUpPrompt();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Chat Panel */}
      <div className="w-[480px] bg-white border-r border-gray-200 flex flex-col">
        {/* Chat Header */}
        <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-gray-900">{projectName}</span>
          </div>
          <button className="text-gray-500 hover:text-gray-900">
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.type === "user" ? (
                // User message - right side, beige bubble
                <div className="max-w-[80%] bg-[#F5F3EF] rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm text-gray-900">{msg.content}</p>
                </div>
              ) : (
                // AI message - left side, white with progressive UI
                <div className="max-w-[90%] space-y-2">
                  {msg.type === "progressive" && msg.progressiveData && (
                    <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-200 p-4">
                      <ProgressiveMessage data={msg.progressiveData} />
                    </div>
                  )}
                  {(msg.type === "bot" || msg.type === "assistant") && (
                    <div className="bg-white rounded-2xl rounded-tl-sm border border-gray-200 p-4">
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {msg.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-1">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.type === "system" && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {isGenerating && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>{msg.content}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up..."
              disabled={!generationCompleted || isGenerating}
              className="w-full resize-none rounded-xl bg-gray-50 border border-gray-200 p-3 pr-12 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-gray-300 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              onClick={sendFollowUpPrompt}
              disabled={!generationCompleted || isGenerating || !inputValue.trim()}
              className="absolute bottom-3 right-3 w-7 h-7 rounded-lg bg-gray-900 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <button className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Design</span>
            </button>
            <span className="text-xs text-gray-400">Cmd + Enter to send</span>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Preview Header */}
        <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeView === "preview"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setActiveView("code")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeView === "code"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="text-gray-600 hover:text-gray-900">
              <Download className="w-4 h-4" />
            </button>
            <button className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors flex items-center gap-2">
              <span>Share</span>
            </button>
            <button className="px-4 py-1.5 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-900 transition-colors flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              <span>Publish</span>
            </button>
            <button className="text-gray-600 hover:text-gray-900">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {activeView === "preview" && (
            <>
              {!previewUrl && isGenerating && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto relative">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse"></div>
                    </div>
                    <p className="text-gray-600 text-sm">Generating your project...</p>
                  </div>
                </div>
              )}

              {!previewUrl && !isGenerating && !isContinuing && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Preview will appear here</p>
                </div>
              )}

              {previewUrl && (
                <div className="w-full h-full p-4">
                  <div className="w-full h-full rounded-lg overflow-hidden border border-gray-300 shadow-lg bg-white">
                    {/* Browser Chrome */}
                    <div className="h-8 bg-gray-100 border-b border-gray-300 flex items-center px-3 gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex-1 mx-4 bg-white rounded px-3 py-0.5 text-xs text-gray-600 border border-gray-300 truncate">
                        {previewUrl}
                      </div>
                    </div>
                    {/* Iframe */}
                    <iframe
                      src={previewUrl}
                      className="w-full h-[calc(100%-2rem)] border-0"
                      title="Website Preview"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeView === "code" && (
            <div className="h-full p-4">
              <div className="h-full bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Code view coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeneratePageV0() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <GeneratePageV0Content />
    </Suspense>
  );
}
