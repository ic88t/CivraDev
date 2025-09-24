"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase-client";

interface Message {
  type: "claude_message" | "tool_use" | "tool_result" | "progress" | "error" | "complete";
  content?: string;
  name?: string;
  input?: any;
  result?: any;
  message?: string;
  previewUrl?: string;
  sandboxId?: string;
}

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prompt = searchParams.get("prompt") || "";
  const continueSandboxId = searchParams.get("sandboxId");
  const isContinuing = searchParams.get("continue") === "true";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [generationCompleted, setGenerationCompleted] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<'checking' | 'online' | 'offline' | 'waking' | 'ready' | 'error'>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    // If continuing with existing sandbox, set up the state
    if (isContinuing && continueSandboxId) {
      setSandboxId(continueSandboxId);
      setGenerationCompleted(true);
      // Check sandbox status first, then wake up if needed
      checkSandboxStatusAndWakeup(continueSandboxId);
      return;
    }

    if (!prompt && !(isContinuing && continueSandboxId)) {
      router.push("/");
      return;
    }
    
    // Prevent double execution in StrictMode
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;
    
    setIsGenerating(true);
    generateWebsite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, router, isContinuing, continueSandboxId]);
  
  const generateWebsite = async () => {
    try {
      // Get current session token
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
        
        // Handle credit-related errors specifically
        if (response.status === 402 && errorData.needsUpgrade) {
          setError(`${errorData.error} Click here to upgrade your plan.`);
          return;
        }
        
        throw new Error(errorData.error || "Failed to generate website");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

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
              // If no completion message was received, still enable chat
              if (!generationCompleted) {
                setGenerationCompleted(true);
                console.log("Generation done, enabling chat (fallback)");
              }
              break;
            }

            try {
              const message = JSON.parse(data) as Message;
              
              if (message.type === "error") {
                throw new Error(message.message);
              } else if (message.type === "complete") {
                setPreviewUrl(message.previewUrl || null);
                setSandboxId(message.sandboxId || null);
                setGenerationCompleted(true);
                setIsGenerating(false);
                console.log("Generation completed, sandboxId:", message.sandboxId);
              } else {
                setMessages((prev) => [...prev, message]);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Error generating website:", err);
      setError(err.message || "An error occurred");
      setIsGenerating(false);
    }
  };
  
  const formatToolInput = (input: any) => {
    if (!input) return "";
    
    // Extract key information based on tool type
    if (input.file_path) {
      return `File: ${input.file_path}`;
    } else if (input.command) {
      return `Command: ${input.command}`;
    } else if (input.pattern) {
      return `Pattern: ${input.pattern}`;
    } else if (input.prompt) {
      return `Prompt: ${input.prompt.substring(0, 100)}...`;
    }
    
    // For other cases, show first meaningful field
    const keys = Object.keys(input);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const value = input[firstKey];
      if (typeof value === 'string' && value.length > 100) {
        return `${firstKey}: ${value.substring(0, 100)}...`;
      }
      return `${firstKey}: ${value}`;
    }
    
    return JSON.stringify(input).substring(0, 100) + "...";
  };

  const sendFollowUpPrompt = async () => {
    if (!followUpPrompt.trim() || isGenerating) return;
    
    console.log("Sending follow-up prompt:", followUpPrompt, "sandboxId:", sandboxId);

    try {
      setIsGenerating(true);
      setError(null);
      
      // Add user message to chat
      const currentPrompt = followUpPrompt;
      const userMessage: Message = {
        type: "claude_message",
        content: `[USER]: ${currentPrompt}`
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Clear the input immediately for better UX
      setFollowUpPrompt("");
      
      // Build conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.type === "claude_message")
        .map(msg => ({
          role: msg.content?.startsWith('[USER]:') ? 'user' : 'assistant',
          content: msg.content?.replace(/^\[(USER|ASSISTANT)\]:\s*/, '') || ''
        }));

      // Use chat continuation API if we have a sandboxId, otherwise use regular generation
      const apiEndpoint = sandboxId ? "/api/chat-continue" : "/api/generate-daytona";
      const requestBody = sandboxId 
        ? {
            sandboxId: sandboxId,
            message: currentPrompt,
            conversationHistory: conversationHistory
          }
        : {
            prompt: currentPrompt
          };

      console.log("Making request to:", apiEndpoint, "with body:", { ...requestBody, conversationHistory: `${conversationHistory.length} messages` });

      // Get auth token for API requests
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${response.status}` };
        }
        
        // Handle credit-related errors specifically
        if (response.status === 402 && errorData.needsUpgrade) {
          setError(`${errorData.error} Click here to upgrade your plan.`);
          return;
        }
        
        throw new Error(errorData.error || "Failed to process follow-up");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

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
                throw new Error(message.content || message.message);
              } else if (message.type === "complete") {
                // Update preview URL and sandbox ID if provided
                if (message.previewUrl) {
                  setPreviewUrl(message.previewUrl);
                }
                if (message.sandboxId && !sandboxId) {
                  setSandboxId(message.sandboxId);
                  setGenerationCompleted(true);
                }
                setIsGenerating(false);
                console.log("Chat continuation completed", { previewUrl: message.previewUrl, sandboxId: message.sandboxId });
              } else if (message.type === "message") {
                // Add assistant response
                const assistantMessage: Message = {
                  type: "claude_message",
                  content: message.content
                };
                setMessages(prev => [...prev, assistantMessage]);
              } else if (message.type === "status") {
                // Add status message as progress type for consistency
                const statusMessage: Message = {
                  type: "progress",
                  message: message.content
                };
                setMessages(prev => [...prev, statusMessage]);
              } else if (message.type === "tool_use") {
                // Add tool use message with proper input handling
                const toolMessage: Message = {
                  type: "tool_use",
                  name: message.name,
                  input: message.input || { file_path: message.file_path }
                };
                setMessages(prev => [...prev, toolMessage]);
              } else {
                // Fallback: try to handle any other message types consistently
                setMessages((prev) => [...prev, message as Message]);
              }
            } catch (parseError) {
              console.warn("Failed to parse message:", data, parseError);
              // Add as a generic progress message if we can't parse it
              if (data.length > 0 && data !== "[DONE]") {
                setMessages(prev => [...prev, {
                  type: "progress",
                  message: data
                }]);
              }
            }
          }
        }
      }
      
    } catch (err: any) {
      console.error("Error sending follow-up:", err);
      setError(err.message || "An error occurred");
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendFollowUpPrompt();
    }
  };

  const checkSandboxStatusAndWakeup = async (sandboxId: string) => {
    const startTime = Date.now();
    console.log(`[Frontend] Starting sandbox status check for ID: ${sandboxId} at ${new Date().toISOString()}`);

    try {
      setSandboxStatus('checking');
      setStatusMessage('Checking sandbox status...');

      // Get auth token for API requests
      console.log('[Frontend] Getting auth session...');
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};

      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
        console.log('[Frontend] Auth token present, length:', session.access_token.length);
      } else {
        console.log('[Frontend] No auth token available');
      }

      // First, check the current status of the sandbox
      const statusUrl = `/api/projects/status?id=${sandboxId}`;
      console.log(`[Frontend] Making status request to: ${statusUrl}`);
      const statusRequestStart = Date.now();

      const statusResponse = await fetch(statusUrl, {
        headers: authHeaders
      });

      const statusRequestDuration = Date.now() - statusRequestStart;
      console.log(`[Frontend] Status request completed in ${statusRequestDuration}ms, status: ${statusResponse.status}`);

      if (!statusResponse.ok) {
        console.error(`[Frontend] Status request failed with status ${statusResponse.status}`);
        let errorData;
        try {
          errorData = await statusResponse.json();
          console.error('[Frontend] Error response body:', errorData);
        } catch (parseError) {
          console.error('[Frontend] Could not parse error response:', parseError);
          errorData = { error: 'Unknown error', status: statusResponse.status };
        }

        if (statusResponse.status === 404) {
          setSandboxStatus('error');
          setStatusMessage('Sandbox no longer exists or was deleted');
          console.log('[Frontend] Sandbox not found (404)');
        } else {
          setSandboxStatus('error');
          setStatusMessage('Failed to check sandbox status');
          console.log('[Frontend] Status check failed with non-404 error');
        }
        return;
      }

      const statusData = await statusResponse.json();
      console.log('[Frontend] Sandbox status response:', {
        ...statusData,
        previewUrl: statusData.previewUrl ? '[URL_SET]' : null
      });

      if (statusData.isOnline) {
        // Sandbox is already online
        console.log('[Frontend] Sandbox is already online');
        setSandboxStatus('ready');
        setStatusMessage('Sandbox is ready');
        if (statusData.previewUrl) {
          setPreviewUrl(statusData.previewUrl);
          console.log('[Frontend] Preview URL set from status response');
        }
        const totalDuration = Date.now() - startTime;
        console.log(`[Frontend] Status check completed successfully in ${totalDuration}ms`);
        return;
      }

      // Sandbox is offline, need to wake it up
      console.log(`[Frontend] Sandbox is offline (state: ${statusData.status}), attempting to wake up`);
      setSandboxStatus('waking');
      setStatusMessage('Waking up sandbox...');

      const wakeRequestStart = Date.now();
      const wakeResponse = await fetch('/api/projects/wake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ sandboxId })
      });

      const wakeRequestDuration = Date.now() - wakeRequestStart;
      console.log(`[Frontend] Wake request completed in ${wakeRequestDuration}ms, status: ${wakeResponse.status}`);

      if (wakeResponse.ok) {
        const wakeData = await wakeResponse.json();
        console.log('[Frontend] Wake response:', {
          ...wakeData,
          previewUrl: wakeData.previewUrl ? '[URL_SET]' : null
        });

        if (wakeData.success && wakeData.isOnline) {
          setSandboxStatus('ready');
          setStatusMessage(wakeData.message || 'Sandbox is ready');
          if (wakeData.previewUrl) {
            setPreviewUrl(wakeData.previewUrl);
            console.log('[Frontend] Preview URL set from wake response');
          }
          const totalDuration = Date.now() - startTime;
          console.log(`[Frontend] Sandbox wakeup completed successfully in ${totalDuration}ms`);
        } else {
          setSandboxStatus('error');
          setStatusMessage('Failed to wake up sandbox');
          console.log('[Frontend] Wake request succeeded but sandbox not online');
        }
      } else {
        let errorData;
        try {
          errorData = await wakeResponse.json();
          console.error('[Frontend] Wake request failed:', errorData);
        } catch (parseError) {
          console.error('[Frontend] Could not parse wake error response:', parseError);
        }
        setSandboxStatus('error');
        setStatusMessage('Failed to wake up sandbox');
        console.log('[Frontend] Wake request failed with HTTP error');
      }
    } catch (error: any) {
      const totalDuration = Date.now() - startTime;
      console.error(`[Frontend] Failed to check/wake sandbox after ${totalDuration}ms:`, {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setSandboxStatus('error');
      setStatusMessage('Error checking sandbox status');
    }
  };

  const fetchPreviewUrl = async (sandboxId: string, shouldWakeUp = false) => {
    try {
      // If we should wake up the sandbox first
      if (shouldWakeUp) {
        // Get auth token for API requests
        const { data: { session } } = await supabase.auth.getSession();
        const authHeaders: Record<string, string> = {};
        
        if (session?.access_token) {
          authHeaders["Authorization"] = `Bearer ${session.access_token}`;
        }

        const wakeResponse = await fetch('/api/projects/wake', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ sandboxId })
        });

        if (wakeResponse.ok) {
          const wakeData = await wakeResponse.json();
          if (wakeData.previewUrl) {
            setPreviewUrl(wakeData.previewUrl);
            return;
          }
        }
      }

      // Get auth token for API requests
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {};
      
      if (session?.access_token) {
        authHeaders["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Fallback to regular preview fetch
      const response = await fetch(`/api/projects/preview?id=${sandboxId}`, {
        headers: authHeaders
      });
      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.previewUrl);
      }
    } catch (error) {
      console.error('Failed to fetch preview URL:', error);
    }
  };

  return (
    <main className="h-screen bg-black flex flex-col overflow-hidden relative">
      <Navbar />
      {/* Spacer for navbar */}
      <div className="h-16" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Chat */}
        <div className="w-[30%] flex flex-col border-r border-gray-800">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Civra</h2>
            <p className="text-gray-400 text-sm mt-1 break-words">
              {isContinuing ? `Continuing project: ${continueSandboxId?.slice(0, 8)}...` : prompt}
            </p>
            {isContinuing && (
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  sandboxStatus === 'ready' ? 'bg-green-400' :
                  sandboxStatus === 'waking' ? 'bg-yellow-400' :
                  sandboxStatus === 'checking' ? 'bg-blue-400' :
                  sandboxStatus === 'error' ? 'bg-red-400' :
                  'bg-gray-400'
                }`}></div>
                <span className={`text-xs ${
                  sandboxStatus === 'ready' ? 'text-green-400' :
                  sandboxStatus === 'waking' ? 'text-yellow-400' :
                  sandboxStatus === 'checking' ? 'text-blue-400' :
                  sandboxStatus === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {sandboxStatus === 'ready' ? 'Ready to continue' :
                   sandboxStatus === 'waking' ? 'Waking up...' :
                   sandboxStatus === 'checking' ? 'Checking status...' :
                   sandboxStatus === 'error' ? 'Error with sandbox' :
                   statusMessage || 'Connecting...'}
                </span>
              </div>
            )}
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 overflow-x-hidden">
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === "claude_message" && (
                  <div className={`rounded-lg p-4 ${
                    message.content?.startsWith('[USER]:') ? 'bg-blue-900/30 ml-8' : 'bg-gray-900'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        message.content?.startsWith('[USER]:') ? 'bg-blue-600' : 'bg-purple-600'
                      }`}>
                        <span className="text-white text-xs">
                          {message.content?.startsWith('[USER]:') ? 'U' : 'S'}
                        </span>
                      </div>
                      <span className="text-white font-medium">
                        {message.content?.startsWith('[USER]:') ? 'You' : 'Civra'}
                      </span>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap break-words">
                      {message.content?.startsWith('[USER]:') 
                        ? message.content.replace(/^\[USER\]:\s*/, '') 
                        : message.content?.startsWith('[ASSISTANT]:')
                          ? message.content.replace(/^\[ASSISTANT\]:\s*/, '')
                          : message.content
                      }
                    </p>
                  </div>
                )}
                
                {message.type === "tool_use" && (
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800 overflow-hidden">
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-blue-400 flex-shrink-0">🔧 {message.name}</span>
                      <span className="text-gray-500 break-all">{formatToolInput(message.input)}</span>
                    </div>
                  </div>
                )}
                
                {message.type === "progress" && (
                  <div className="text-gray-500 text-sm font-mono break-all">
                    {message.message}
                  </div>
                )}
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Working...</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-400">{error.split('Click here')[0]}</p>
                    {error.includes('Click here to upgrade') && (
                      <div className="mt-3 flex gap-2">
                        <a 
                          href="/pricing"
                          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                        >
                          Upgrade Plan
                        </a>
                        <button
                          onClick={() => setError(null)}
                          className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Bottom input area */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={
                  isContinuing && sandboxStatus !== 'ready' ? "Connecting to sandbox..." :
                  generationCompleted ? "Continue improving your site..." :
                  "Ask Civra..."
                }
                value={followUpPrompt}
                onChange={(e) => setFollowUpPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg border border-gray-800 focus:outline-none focus:border-gray-700 disabled:opacity-50"
                disabled={
                  isGenerating ||
                  !generationCompleted ||
                  (isContinuing && sandboxStatus !== 'ready')
                }
              />
              <button 
                onClick={sendFollowUpPrompt}
                disabled={
                  isGenerating ||
                  !followUpPrompt.trim() ||
                  !generationCompleted ||
                  (isContinuing && sandboxStatus !== 'ready')
                }
                className="p-2 text-gray-400 hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            {!generationCompleted && !isGenerating && !isContinuing && (
              <p className="text-gray-500 text-xs mt-2">
                Chat will be enabled after initial generation completes
              </p>
            )}
            {generationCompleted && !sandboxId && !isContinuing && (
              <p className="text-yellow-500 text-xs mt-2">
                Warning: No sandbox ID found. Follow-up prompts will create a new project.
              </p>
            )}
            {isContinuing && sandboxStatus !== 'ready' && (
              <div className="mt-2">
                <p className={`text-xs ${
                  sandboxStatus === 'error' ? 'text-red-400' :
                  sandboxStatus === 'waking' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {statusMessage ||
                   (sandboxStatus === 'checking' ? 'Checking sandbox status...' :
                    sandboxStatus === 'waking' ? 'Waking up sandbox... This may take a moment.' :
                    sandboxStatus === 'error' ? 'Unable to connect to sandbox. Please try refreshing.' :
                    'Connecting to sandbox...')}
                </p>
                {sandboxStatus === 'error' && statusMessage?.includes('no longer exists') && (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={async () => {
                        if (continueSandboxId) {
                          // Get auth token for API requests
                          const { data: { session } } = await supabase.auth.getSession();
                          const authHeaders: Record<string, string> = {};
                          
                          if (session?.access_token) {
                            authHeaders["Authorization"] = `Bearer ${session.access_token}`;
                          }

                          fetch(`/api/projects/debug?id=${continueSandboxId}`, {
                            headers: authHeaders
                          })
                            .then(res => res.json())
                            .then(data => {
                              console.log('Debug info:', data);
                              alert(`Debug info logged to console. Project in DB: ${data.databaseInfo.found}, Daytona sandboxes: ${data.daytonaInfo?.totalSandboxes || 'N/A'}`);
                            })
                            .catch(err => console.error('Debug failed:', err));
                        }
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Debug Info
                    </button>
                    <span className="text-xs text-gray-500">|</span>
                    <button
                      onClick={() => router.push('/')}
                      className="text-xs text-green-400 hover:text-green-300 underline"
                    >
                      Create New Project
                    </button>
                  </div>
                )}
              </div>
            )}
            {isContinuing && sandboxStatus === 'ready' && (
              <p className="text-green-400 text-xs mt-2">
                Sandbox is ready! You can now continue building your project.
              </p>
            )}
          </div>
        </div>
        
        {/* Right side - Preview */}
        <div className="w-[70%] bg-gray-950 flex items-center justify-center">
          {!previewUrl && isGenerating && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gray-700 rounded-xl animate-pulse"></div>
              </div>
              <p className="text-gray-400">Spinning up preview...</p>
            </div>
          )}

          {!previewUrl && isContinuing && sandboxStatus !== 'ready' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <div className={`w-12 h-12 rounded-xl ${
                  sandboxStatus === 'checking' ? 'bg-blue-600 animate-pulse' :
                  sandboxStatus === 'waking' ? 'bg-yellow-600 animate-pulse' :
                  sandboxStatus === 'error' ? 'bg-red-600' :
                  'bg-gray-700 animate-pulse'
                }`}></div>
              </div>
              <p className="text-gray-400 mb-2">
                {sandboxStatus === 'checking' ? 'Checking sandbox status...' :
                 sandboxStatus === 'waking' ? 'Waking up sandbox...' :
                 sandboxStatus === 'error' ? 'Sandbox connection error' :
                 'Connecting to sandbox...'}
              </p>
              {sandboxStatus === 'waking' && (
                <p className="text-gray-500 text-sm">This may take up to 30 seconds</p>
              )}
            </div>
          )}

          {previewUrl && (
            <div className="w-full h-full relative">
              {/* Preview controls */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </button>
                <button
                  onClick={() => {
                    const iframe = document.querySelector('iframe[title="Website Preview"]') as HTMLIFrameElement;
                    if (iframe) {
                      iframe.src = iframe.src; // Reload the iframe
                    }
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload
                </button>
              </div>

              {/* Iframe with Daytona warning detection */}
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Website Preview"
                onLoad={() => {
                  // Check if the iframe loaded the Daytona warning page
                  const iframe = document.querySelector('iframe[title="Website Preview"]') as HTMLIFrameElement;
                  if (iframe && iframe.contentWindow) {
                    try {
                      const iframeUrl = iframe.contentWindow.location.href;
                      if (iframeUrl.includes('daytona') && !iframeUrl.includes('proxy.daytona.works')) {
                        console.log('[Frontend] Daytona warning page detected in iframe');
                      }
                    } catch (e) {
                      // Cross-origin iframe access will fail, which is expected
                      console.log('[Frontend] Iframe loaded (cross-origin)');
                    }
                  }
                }}
              />

              {/* Help overlay - always visible when iframe has issues */}
              <div className="absolute bottom-4 left-4 bg-yellow-500 text-black px-3 py-2 rounded-lg text-sm max-w-xs">
                <p className="font-medium mb-1">💡 Tip</p>
                <p className="text-xs">
                  If the preview shows a warning page, use the "Open in New Tab" button above for full functionality.
                </p>
              </div>
            </div>
          )}

          {!previewUrl && !isGenerating && !isContinuing && (
            <div className="text-center">
              <p className="text-gray-400">Preview will appear here</p>
            </div>
          )}

          {!previewUrl && !isGenerating && isContinuing && sandboxStatus === 'ready' && (
            <div className="text-center">
              <p className="text-gray-400">Loading preview...</p>
              <p className="text-gray-500 text-sm mt-2">The development server may still be starting up</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div></div>}>
      <GeneratePageContent />
    </Suspense>
  );
}