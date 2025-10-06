"use client";

import { useState, useEffect, useRef, Suspense, KeyboardEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { Send, Loader2, Code2, Eye, Download, Rocket, ChevronLeft, Sparkles, ChevronRight, File, Folder } from "lucide-react";

interface Message {
  id: string | number;
  type: "user" | "bot" | "system";
  content: string;
  timestamp?: string;
}

function GeneratePageContent() {
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
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileCache, setFileCache] = useState<Record<string, string>>({});

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
      setMessages([
        {
          id: 1,
          type: "system",
          content: `Continuing project ${continueSandboxId.slice(0, 8)}...`,
          timestamp: new Date().toLocaleString(),
        },
      ]);
      fetchPreviewUrl(continueSandboxId);
      return;
    }

    if (!prompt) {
      router.push("/");
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

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
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "bot",
                  content: "✨ Your website has been generated successfully!",
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "claude_message") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "bot",
                  content: message.content,
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "tool_use") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "system",
                  content: `🔧 ${message.name}: ${message.input?.file_path || ""}`,
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "progress") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "system",
                  content: message.message,
                  timestamp: new Date().toLocaleString(),
                }]);
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
              } else if (message.type === "message") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "bot",
                  content: message.content,
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "status") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "system",
                  content: message.content,
                  timestamp: new Date().toLocaleString(),
                }]);
              } else if (message.type === "tool_use") {
                setMessages((prev) => [...prev, {
                  id: Date.now(),
                  type: "system",
                  content: `🔧 ${message.name}: ${message.input?.file_path || ""}`,
                  timestamp: new Date().toLocaleString(),
                }]);
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

  const fetchFiles = async () => {
    if (!sandboxId) return;

    setLoadingFiles(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/projects/files?sandboxId=${sandboxId}`, {
        headers: authHeaders,
      });

      if (response.ok) {
        const data = await response.json();
        const fileList = data.files || [];
        setFiles(fileList);

        // Prefetch all files in parallel (limit to reasonable file sizes)
        const filesToCache = fileList.filter((f: string) => {
          // Skip large binary files, images, etc.
          return !f.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|webm|zip|gz)$/);
        });

        // Fetch all files in parallel
        const fetchPromises = filesToCache.map(async (filePath: string) => {
          try {
            const fileResponse = await fetch(
              `/api/projects/files?sandboxId=${sandboxId}&filePath=${encodeURIComponent(filePath)}`,
              { headers: authHeaders }
            );

            if (fileResponse.ok) {
              const fileData = await fileResponse.json();
              return { path: filePath, content: fileData.content || "" };
            }
          } catch (error) {
            console.error(`Failed to prefetch ${filePath}:`, error);
          }
          return null;
        });

        // Wait for all files to load
        const results = await Promise.all(fetchPromises);

        // Build cache object
        const cache: Record<string, string> = {};
        results.forEach(result => {
          if (result) {
            cache[result.path] = result.content;
          }
        });

        setFileCache(cache);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchFileContent = async (filePath: string) => {
    if (!sandboxId) return;

    // Check cache first
    if (fileCache[filePath]) {
      setFileContent(fileCache[filePath]);
      setSelectedFile(filePath);
      return;
    }

    setLoadingFile(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/projects/files?sandboxId=${sandboxId}&filePath=${encodeURIComponent(filePath)}`,
        { headers: authHeaders }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.content || "";

        // Cache the file content
        setFileCache(prev => ({ ...prev, [filePath]: content }));
        setFileContent(content);
        setSelectedFile(filePath);
      }
    } catch (error) {
      console.error("Failed to fetch file content:", error);
    } finally {
      setLoadingFile(false);
    }
  };

  useEffect(() => {
    if (activeView === "code" && sandboxId && files.length === 0) {
      fetchFiles();
    }
  }, [activeView, sandboxId]);

  const buildFileTree = (files: string[]) => {
    const tree: any = {};

    files.forEach(file => {
      const parts = file.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // It's a file
          if (!current._files) current._files = [];
          current._files.push(part);
        } else {
          // It's a directory
          if (!current[part]) current[part] = {};
          current = current[part];
        }
      });
    });

    return tree;
  };

  const renderFileTree = (tree: any, path: string = "", level: number = 0) => {
    const items: JSX.Element[] = [];

    // Render directories
    Object.keys(tree).forEach(key => {
      if (key === '_files') return;

      const fullPath = path ? `${path}/${key}` : key;
      items.push(
        <div key={fullPath}>
          <div
            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-800 cursor-pointer text-xs"
            style={{ paddingLeft: `${(level * 12) + 8}px` }}
          >
            <Folder className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 truncate">{key}</span>
          </div>
          {renderFileTree(tree[key], fullPath, level + 1)}
        </div>
      );
    });

    // Render files
    if (tree._files) {
      tree._files.forEach((file: string) => {
        const fullPath = path ? `${path}/${file}` : file;
        items.push(
          <div
            key={fullPath}
            className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-800 cursor-pointer text-xs transition-colors ${
              selectedFile === fullPath ? 'bg-gray-800' : ''
            }`}
            style={{ paddingLeft: `${(level * 12) + 8}px` }}
            onClick={() => fetchFileContent(fullPath)}
          >
            <File className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span className="text-gray-300 truncate">{file}</span>
          </div>
        );
      });
    }

    return items;
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Left Sidebar - AI Assistant */}
      <div className="w-96 border-r border-gray-800 flex flex-col bg-[#0a0a0a]">
        {/* Logo */}
        <div className="h-14 border-b border-gray-800 flex items-center px-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-white hover:text-gray-300">
            <ChevronLeft className="w-4 h-4" />
            <span className="font-semibold tracking-wider text-sm">CIVRA</span>
          </button>
        </div>

        {/* AI Assistant Header */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-medium">AI Assistant</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              {msg.type === "user" && (
                <div className="bg-gray-800 rounded p-2 text-gray-300">
                  {msg.content}
                </div>
              )}
              {msg.type === "bot" && (
                <div className="text-gray-400 leading-relaxed">
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} className="mb-1">{line}</p>
                  ))}
                </div>
              )}
              {msg.type === "system" && (
                <div className="text-gray-600 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs">{msg.content}</span>
                </div>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to build?"
              disabled={!generationCompleted || isGenerating}
              className="w-full resize-none rounded bg-gray-900 border border-gray-800 p-2 pr-8 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-700 disabled:opacity-50"
              rows={2}
            />
            <button
              onClick={sendFollowUpPrompt}
              disabled={!generationCompleted || isGenerating || !inputValue.trim()}
              className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0a0a]">
          {/* Left - View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                activeView === "preview"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => setActiveView("code")}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
                activeView === "code"
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Code2 className="w-4 h-4" />
              Code
            </button>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <button className="px-4 py-1.5 rounded text-sm font-medium bg-gray-800 text-white hover:bg-gray-700 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-1.5 rounded text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Deploy
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#0a0a0a] p-6 overflow-auto">
          {activeView === "preview" && (
            <>
              {!previewUrl && isGenerating && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto relative">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse"></div>
                    </div>
                    <p className="text-gray-500 text-sm">Generating your project...</p>
                  </div>
                </div>
              )}

              {!previewUrl && !isGenerating && !isContinuing && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-600">Preview will appear here</p>
                </div>
              )}

              {previewUrl && (
                <div className="w-full h-full rounded-lg overflow-hidden border border-gray-800 shadow-2xl bg-white">
                  {/* Browser Chrome */}
                  <div className="h-8 bg-gray-100 border-b border-gray-300 flex items-center px-3 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex-1 mx-4 bg-white rounded px-3 py-0.5 text-xs text-gray-600 border border-gray-300">
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
              )}
            </>
          )}

          {activeView === "code" && (
            <div className="h-full flex rounded-lg overflow-hidden border border-gray-800 bg-[#1e1e1e]">
              {/* File Tree Sidebar */}
              <div className="w-64 border-r border-gray-800 bg-[#1a1a1a] flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-800 text-xs font-medium text-gray-400">
                  Files
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    </div>
                  ) : files.length > 0 ? (
                    renderFileTree(buildFileTree(files))
                  ) : (
                    <div className="px-3 py-4 text-xs text-gray-600">
                      No files available
                    </div>
                  )}
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedFile ? (
                  <>
                    {/* File Tab */}
                    <div className="h-10 border-b border-gray-800 flex items-center px-4 bg-[#1a1a1a]">
                      <div className="flex items-center gap-2 text-xs">
                        <File className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-300 truncate">{selectedFile}</span>
                      </div>
                    </div>

                    {/* Code Content */}
                    {loadingFile ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto">
                        <pre className="p-4 text-xs text-gray-300 font-mono leading-6">
                          {fileContent.split('\n').map((line, i) => (
                            <div key={i} className="flex">
                              <span className="inline-block w-12 text-right pr-4 text-gray-600 select-none flex-shrink-0">
                                {i + 1}
                              </span>
                              <code className="flex-1 whitespace-pre overflow-x-auto">{line || ' '}</code>
                            </div>
                          ))}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
                    Select a file to view its contents
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
        </div>
      }
    >
      <GeneratePageContent />
    </Suspense>
  );
}
