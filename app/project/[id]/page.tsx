"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { ChatSidebar } from "@/components/workspace/ChatSidebar";
import { LivePreview } from "@/components/workspace/LivePreview";
import {
  ChevronLeft,
  Download,
  Eye,
  Home,
  Monitor,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Navbar from "@/components/Navbar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: any[];
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sandboxId = params?.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isDesktopView, setIsDesktopView] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [project, setProject] = useState<any>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("sandbox_id", sandboxId)
          .single();

        if (error) {
          console.error("Error fetching project:", error);
          toast.error("Project not found");
          router.push("/generate");
          return;
        }

        setProject(data);
        
        // Add initial prompt as first message if available
        if (data.prompt && messages.length === 0) {
          const initialMessage: Message = {
            id: "initial",
            role: "user",
            content: data.prompt,
            timestamp: data.created_at || new Date().toISOString(),
          };
          setMessages([initialMessage]);
        }
      } catch (err) {
        console.error("Error:", err);
        toast.error("Failed to load project");
      } finally {
        setLoadingProject(false);
      }
    };

    if (sandboxId) {
      fetchProject();
    }
  }, [sandboxId, router]);

  const handleSendMessage = async (attachments?: File[]) => {
    if (!inputValue.trim() && (!attachments || attachments.length === 0)) {
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the generate-daytona API with streaming
      const response = await fetch("/api/generate-daytona", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: inputValue,
          sandboxId: sandboxId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let assistantMessageId = `assistant-${Date.now()}`;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "claude_message") {
                  assistantMessage += parsed.content;
                  
                  // Update or add assistant message
                  setMessages((prev) => {
                    const existing = prev.find((m) => m.id === assistantMessageId);
                    if (existing) {
                      return prev.map((m) =>
                        m.id === assistantMessageId
                          ? { ...m, content: assistantMessage }
                          : m
                      );
                    } else {
                      return [
                        ...prev,
                        {
                          id: assistantMessageId,
                          role: "assistant" as const,
                          content: assistantMessage,
                          timestamp: new Date().toISOString(),
                        },
                      ];
                    }
                  });
                } else if (parsed.type === "progress") {
                  // Show progress as toast
                  console.log("Progress:", parsed.message);
                } else if (parsed.type === "error") {
                  toast.error(parsed.message);
                } else if (parsed.type === "complete") {
                  // Update project with new preview URL
                  if (parsed.previewUrl) {
                    setProject((prev: any) => ({
                      ...prev,
                      preview_url: parsed.previewUrl,
                      status: "ACTIVE",
                    }));
                  }
                  toast.success("Changes applied successfully!");
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string): React.ReactNode[] => {
    // Simple markdown-like formatting
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const code = part.slice(3, -3).trim();
        return (
          <pre key={index} className="bg-gray-800 rounded p-3 my-2 overflow-x-auto">
            <code className="text-sm">{code}</code>
          </pre>
        );
      } else if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="bg-gray-700 px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
      } else if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleExport = async () => {
    try {
      toast.success("Export functionality coming soon!");
    } catch (error) {
      toast.error("Failed to export project");
    }
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top Navigation */}
      <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800/40 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/generate"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </Link>
            <div className="h-6 w-px bg-gray-700" />
            <h1 className="text-lg font-semibold text-white">
              {project?.name || "Workspace"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-800/60 backdrop-blur-sm rounded-lg border border-gray-700/40 p-1">
              <button
                onClick={() => setIsDesktopView(true)}
                className={`p-2 rounded transition-all ${
                  isDesktopView
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsDesktopView(false)}
                className={`p-2 rounded transition-all ${
                  !isDesktopView
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800/60 hover:bg-gray-700/60 backdrop-blur-sm text-white rounded-lg border border-gray-700/40 hover:border-gray-600/40 transition-all text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSendMessage={handleSendMessage}
          messagesEndRef={messagesEndRef}
          textareaRef={textareaRef}
          onKeyDown={handleKeyDown}
          formatMessageContent={formatMessageContent}
          isLoading={isLoading}
          sandboxId={sandboxId}
        />

        {/* Preview Area */}
        <div className="flex-1 p-6 overflow-hidden">
          <LivePreview sandboxId={sandboxId} isDesktopView={isDesktopView} />
        </div>
      </div>
    </div>
  );
}

