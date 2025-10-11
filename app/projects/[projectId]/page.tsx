"use client";

import { useState, useEffect, useRef, Suspense, KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { Send, Loader2, Code2, Eye, Download, Rocket, Sparkles, ArrowLeft, Copy, RotateCcw, MoreVertical, File, Folder, Monitor, Tablet, Smartphone, ChevronDown, Check, Plus, Image as ImageIcon, X } from "lucide-react";
import { ProgressiveMessage, ProgressiveMessageData } from "./components/ProgressiveMessage";
import { ProgressiveMessageManager, parseStreamMessage } from "./utils/progressiveMessageManager";
import { Sidebar } from "./components/Sidebar";
import { TopNavbar } from "@/app/components/TopNavbar";

interface Message {
  id: string | number;
  type: "user" | "bot" | "system" | "assistant" | "progressive";
  content: string;
  timestamp?: string;
  progressiveData?: ProgressiveMessageData;
  images?: Array<{ preview: string; file?: File }>;
}

function ProjectPageContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "code">("preview");
  const [activeTab, setActiveTab] = useState("chat");
  const [projectName, setProjectName] = useState("New Project");
  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileCache, setFileCache] = useState<Record<string, string>>({});
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "phone">("desktop");
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [attachedImages, setAttachedImages] = useState<Array<{ file: File; preview: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasStartedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load project data
  useEffect(() => {
    if (!projectId) {
      router.push("/");
      return;
    }

    loadProject();
  }, [projectId, router]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Fetch project details
      const projectResponse = await fetch(`/api/projects/${projectId}`, {
        headers: authHeaders,
      });

      if (!projectResponse.ok) {
        throw new Error("Project not found");
      }

      const project = await projectResponse.json();
      console.log('[LOAD-PROJECT] Project data:', {
        name: project.name,
        status: project.status,
        sandboxId: project.sandboxId,
        hasPreviewUrl: !!project.previewUrl,
        previewUrl: project.previewUrl
      });

      // Set project data
      setProjectName(project.name || "New Project");
      setSandboxId(project.sandboxId || null);

      // Load chat history if project exists
      if (project.sandboxId) {
        setGenerationCompleted(true);
        await loadChatHistory(project.sandboxId);

        // Wake up Daytona in the background if it's stopped/inactive
        if (project.status === 'stopped' || project.status === 'inactive') {
          console.log('[LOAD-PROJECT] Sandbox is stopped, initiating wake-up...');
          // DON'T set preview URL yet - keep it null to show loading screen
          // Wake up sandbox without blocking the UI
          setIsLoadingPreview(true);
          wakeUpSandbox(project.sandboxId, authHeaders);
        } else {
          console.log('[LOAD-PROJECT] Sandbox is running, fetching fresh preview URL...');
          // If already running, set preview URL first, then fetch fresh one
          if (project.previewUrl) {
            console.log('[LOAD-PROJECT] Setting initial preview URL:', project.previewUrl);
            setPreviewUrl(project.previewUrl);
          }
          // If already running, just fetch the preview URL
          setIsLoadingPreview(true);
          await fetchPreviewUrl(project.sandboxId);
          // Don't set isLoadingPreview to false here - let the iframe onLoad handle it
        }

        // Check if screenshot is missing and preview URL exists - capture it
        if (!project.screenshot_url && project.previewUrl) {
          console.log('📸 [SCREENSHOT] No screenshot found, capturing one...');
          captureScreenshotInBackground(authHeaders);
        }
      } else if (project.status === 'creating' && project.prompt && !hasStartedRef.current) {
        // Start initial generation if project is new and hasn't been started yet
        hasStartedRef.current = true;
        setIsLoading(false);
        await startInitialGeneration(project.prompt);
        return;
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load project:", error);
      setIsLoading(false);
      // Optionally redirect to home if project not found
      // router.push("/");
    }
  };

  const captureScreenshotInBackground = async (authHeaders: Record<string, string>, forceCapture = false) => {
    try {
      // Check if screenshot already exists (unless forcing capture)
      if (!forceCapture) {
        const checkResponse = await fetch(`/api/projects/${projectId}`, {
          headers: authHeaders,
        });

        if (checkResponse.ok) {
          const projectData = await checkResponse.json();
          if (projectData.screenshot_url) {
            console.log('📸 [SCREENSHOT] Screenshot already exists, skipping capture');
            return;
          }
        }
      }

      console.log('📸 [SCREENSHOT] Triggering screenshot capture...');

      const response = await fetch(`/api/projects/${projectId}/screenshot-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [SCREENSHOT] Screenshot captured successfully:', data.screenshot_url);
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('⚠️ [SCREENSHOT] Screenshot capture failed:', error);
      }
    } catch (error) {
      console.log('❌ [SCREENSHOT] Screenshot capture error:', error);
    }
  };

  const wakeUpSandbox = async (sandboxId: string, authHeaders: Record<string, string>) => {
    try {
      console.log(`🚀 [WAKE-UP] Starting wake-up process for sandbox: ${sandboxId}`);

      const response = await fetch('/api/projects/wake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ sandboxId })
      });

      console.log(`📡 [WAKE-UP] API Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [WAKE-UP] API Response data:', data);

        // Update preview URL when ready (keep loading state until iframe loads)
        if (data.previewUrl) {
          setPreviewUrl(data.previewUrl);
          // Don't set isLoadingPreview to false here - let the iframe onLoad handle it
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [WAKE-UP] API Error response:', errorData);
        setIsLoadingPreview(false);
      }
    } catch (error) {
      console.error('❌ [WAKE-UP] Failed to wake up sandbox:', error);
      setIsLoadingPreview(false);
    }
  };

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
      } else {
        // If preview fetch fails, stop loading
        console.error("Failed to fetch preview URL:", response.status);
        setIsLoadingPreview(false);
      }
    } catch (error) {
      console.error("Failed to fetch preview URL:", error);
      setIsLoadingPreview(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeviceDropdown) {
        setShowDeviceDropdown(false);
      }
    };

    if (showDeviceDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDeviceDropdown]);

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
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
            style={{ paddingLeft: `${(level * 12) + 12}px` }}
          >
            <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700 truncate">{key}</span>
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
            onClick={() => fetchFileContent(fullPath)}
            className={`flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm ${
              selectedFile === fullPath ? "bg-blue-50 text-blue-600" : "text-gray-700"
            }`}
            style={{ paddingLeft: `${(level * 12) + 12}px` }}
          >
            <File className={`w-4 h-4 flex-shrink-0 ${selectedFile === fullPath ? "text-blue-600" : "text-gray-500"}`} />
            <span className="truncate">{file}</span>
          </div>
        );
      });
    }

    return items;
  };

  const startInitialGeneration = async (prompt: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      // Add user message
      const userMessage: Message = {
        id: Date.now(),
        type: "user",
        content: prompt,
        timestamp: new Date().toLocaleString(),
      };

      setMessages([userMessage]);
      setIsGenerating(true);

      const progressiveMessageId = Date.now() + 1;
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
        body: JSON.stringify({ prompt, projectId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate project");
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
            } catch (parseError) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error generating project:", err);
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
    if ((!inputValue.trim() && attachedImages.length === 0) || isGenerating || !sandboxId) return;

    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: inputValue,
      timestamp: new Date().toLocaleString(),
      images: attachedImages.length > 0 ? attachedImages : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentImages = [...attachedImages];
    setInputValue("");
    setAttachedImages([]);
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
          projectId: projectId,
          sandboxId: sandboxId,
          message: inputValue,
          conversationHistory: conversationHistory,
          images: currentImages.length > 0 ? currentImages.map(img => ({
            type: "image",
            source: {
              type: "base64",
              media_type: img.file.type,
              data: img.preview.split(',')[1], // Remove data:image/xxx;base64, prefix
            }
          })) : undefined,
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: Array<{ file: File; preview: string }> = [];

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push({
            file,
            preview: reader.result as string
          });

          if (newImages.length === files.length) {
            setAttachedImages(prev => [...prev, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 animate-pulse"></div>
          </div>
          <p className="text-gray-600 text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Navbar */}
      <TopNavbar
        projectName={projectName}
        previewUrl={previewUrl}
        onShare={() => {
          if (previewUrl) {
            navigator.clipboard.writeText(previewUrl);
            // TODO: Show toast notification
          }
        }}
        onPublish={() => {
          // TODO: Implement publish flow
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Chat Panel */}
      <div className="w-[480px] bg-white border-r border-gray-200 flex flex-col chat-roboto">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.type === "user" ? (
                // User message - right side, beige bubble
                <div className="max-w-[80%] space-y-2">
                  {/* Images */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {msg.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img.preview}
                          alt={`Attachment ${idx + 1}`}
                          className="max-w-[200px] max-h-[200px] rounded-lg border border-gray-300 object-cover"
                        />
                      ))}
                    </div>
                  )}
                  {/* Text Content */}
                  {msg.content && (
                    <div className="bg-[#F5F3EF] rounded-2xl rounded-tr-sm px-4 py-3">
                      <p className="text-sm text-gray-900">{msg.content}</p>
                    </div>
                  )}
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
          {/* Image Previews */}
          {attachedImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedImages.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img.preview}
                    alt={`Attachment ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

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

            {/* Send button */}
            <button
              onClick={sendFollowUpPrompt}
              disabled={!generationCompleted || isGenerating || (!inputValue.trim() && attachedImages.length === 0)}
              className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* Image attachment button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!generationCompleted || isGenerating}
                className="w-7 h-7 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Attach images"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Edit/Design button */}
              <button
                disabled={!generationCompleted || isGenerating}
                className="flex items-center gap-1 px-2 h-7 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium">Edit</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-gray-500">
              {/* Chat indicator */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-400">Chat</span>
              </div>

              {/* Send button indicator */}
              <button
                onClick={sendFollowUpPrompt}
                disabled={!generationCompleted || isGenerating || (!inputValue.trim() && attachedImages.length === 0)}
                className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Preview Tabs */}
        <div className="h-12 border-b border-gray-200 px-4 flex items-center justify-between flex-shrink-0">
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

          {/* Device Selector - Right */}
          <div className="flex items-center gap-2">
            {activeView === "preview" && (
              <div className="relative">
                <button
                  onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                >
                  {previewDevice === "desktop" && <Monitor className="w-4 h-4 text-gray-700" />}
                  {previewDevice === "tablet" && <Tablet className="w-4 h-4 text-gray-700" />}
                  {previewDevice === "phone" && <Smartphone className="w-4 h-4 text-gray-700" />}
                  <span className="text-sm font-medium text-gray-700 capitalize">{previewDevice}</span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>

                {/* Dropdown Menu */}
                {showDeviceDropdown && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                    <button
                      onClick={() => {
                        setPreviewDevice("desktop");
                        setShowDeviceDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-700" />
                        <span className="text-sm text-gray-700">Desktop</span>
                      </div>
                      {previewDevice === "desktop" && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setPreviewDevice("tablet");
                        setShowDeviceDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Tablet className="w-4 h-4 text-gray-700" />
                        <span className="text-sm text-gray-700">Tablet</span>
                      </div>
                      {previewDevice === "tablet" && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => {
                        setPreviewDevice("phone");
                        setShowDeviceDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-gray-700" />
                        <span className="text-sm text-gray-700">Phone</span>
                      </div>
                      {previewDevice === "phone" && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {activeView === "preview" && (
            <>
              {!previewUrl && !isGenerating && !isLoadingPreview && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Preview will appear here</p>
                </div>
              )}

              {isLoadingPreview && !previewUrl && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse"></div>
                      <div className="absolute inset-2 rounded-xl bg-gray-50"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-900 font-medium text-lg">Loading Environment</p>
                      <p className="text-gray-500 text-sm mt-1">Waking up your Daytona workspace...</p>
                    </div>
                  </div>
                </div>
              )}

              {previewUrl && (
                <div className="w-full h-full p-4 flex items-center justify-center">
                  <div
                    className={`h-full rounded-lg overflow-hidden border border-gray-300 shadow-lg bg-white transition-all duration-300 relative ${
                      previewDevice === "desktop" ? "w-full" :
                      previewDevice === "tablet" ? "w-[768px]" :
                      "w-[375px]"
                    }`}
                  >
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

                    {/* Loading Overlay */}
                    {isLoadingPreview && (
                      <div className="absolute inset-0 top-8 bg-gray-50 flex items-center justify-center z-10">
                        <div className="text-center space-y-3">
                          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                          <p className="text-gray-700 font-medium">Loading...</p>
                        </div>
                      </div>
                    )}

                    {/* Iframe - key forces reload when URL changes */}
                    <iframe
                      key={previewUrl}
                      src={previewUrl}
                      className="w-full h-[calc(100%-2rem)] border-0"
                      title="Website Preview"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                      onLoad={() => {
                        console.log('✅ Iframe loaded successfully');
                        setIsLoadingPreview(false);
                      }}
                      onError={(e) => {
                        console.error('❌ Iframe failed to load', e);
                        setIsLoadingPreview(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeView === "code" && (
            <div className="h-full flex bg-white">
              {/* File Tree Sidebar */}
              <div className="w-64 border-r border-gray-200 overflow-y-auto">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Files</h3>
                </div>
                <div className="py-2">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : files.length > 0 ? (
                    renderFileTree(buildFileTree(files))
                  ) : (
                    <div className="px-3 py-8 text-sm text-gray-500 text-center">
                      No files available
                    </div>
                  )}
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col">
                {selectedFile ? (
                  <>
                    {/* File Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <File className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{selectedFile}</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(fileContent);
                          // TODO: Show toast notification
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>

                    {/* Code Content */}
                    <div className="flex-1 overflow-auto">
                      {loadingFile ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <pre className="p-4 text-sm font-mono text-gray-800 whitespace-pre-wrap break-words">
                          {fileContent}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Select a file to view its contents</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}
