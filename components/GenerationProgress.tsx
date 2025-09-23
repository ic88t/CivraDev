"use client";

import { useState, useEffect } from "react";

interface ProgressBubble {
  id: string;
  title: string;
  status: "In progress" | "Done" | "Queued" | "Skipped" | "Error";
  description: string;
  actions: string[];
  details?: string[];
  timestamp: string;
}

interface ProgressHeader {
  task: string;
  environment: "Local" | "Cloud";
  project: string;
  currentStep: string;
  progress: { current: number; total: number; percent: number };
}

interface GenerationProgressProps {
  prompt: string;
  mode: "local" | "daytona";
  messages: any[];
  isGenerating: boolean;
  error?: string | null;
  onComplete?: (summary: any) => void;
}

export default function GenerationProgress({ 
  prompt, 
  mode, 
  messages, 
  isGenerating, 
  error,
  onComplete 
}: GenerationProgressProps) {
  const [bubbles, setBubbles] = useState<ProgressBubble[]>([]);
  const [header, setHeader] = useState<ProgressHeader>({
    task: prompt,
    environment: mode === "local" ? "Local" : "Cloud",
    project: "Web3 App",
    currentStep: "Initializing...",
    progress: { current: 0, total: 8, percent: 0 }
  });

  useEffect(() => {
    console.log('[PROGRESS DEBUG] Messages received:', messages.length, messages);
    processMessages(messages);
  }, [messages]);

  const processMessages = (msgs: any[]) => {
    console.log('[PROGRESS DEBUG] Processing', msgs.length, 'messages');
    const newBubbles: ProgressBubble[] = [];
    let currentStep = "Initializing...";
    let currentProgress = 0;
    const totalSteps = 8;
    
    // Track which steps have been seen
    let hasSetup = false;
    let hasAnalyze = false;
    let hasPlan = false;
    let hasGenerate = false;
    let hasDeps = false;
    let hasServer = false;

    // Process different message types into bubbles
    msgs.forEach((msg, index) => {
      console.log(`[PROGRESS DEBUG] Processing message ${index}:`, msg.type, msg.step || 'no-step', msg.message || msg.content);
      
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      if (msg.type === "progress") {
        // Handle structured step messages
        if (msg.step === "setup") {
          hasSetup = true;
          if (!newBubbles.find(b => b.id === "setup")) {
            newBubbles.push({
              id: "setup",
              title: "Setup environment",
              status: "In progress",
              description: "Creating project structure and workspace",
              actions: ["Initialize project directory", "Set up development environment"],
              details: [msg.message],
              timestamp
            });
            currentStep = "Setting up environment";
            currentProgress = Math.max(currentProgress, 1);
          } else {
            const bubble = newBubbles.find(b => b.id === "setup");
            if (bubble && bubble.details) {
              bubble.details.push(msg.message);
            }
          }
        } else if (msg.step === "analyze") {
          hasAnalyze = true;
          // Mark setup as done when we move to analyze
          const setupBubble = newBubbles.find(b => b.id === "setup");
          if (setupBubble) setupBubble.status = "Done";
          
          if (!newBubbles.find(b => b.id === "analyze")) {
            newBubbles.push({
              id: "analyze",
              title: "Analyze requirements",
              status: "In progress",
              description: "Understanding project requirements and planning structure",
              actions: ["Parse user requirements", "Plan Web3 design system", "Identify key features"],
              details: [msg.message],
              timestamp
            });
            currentStep = "Analyzing requirements";
            currentProgress = Math.max(currentProgress, 2);
          }
        } else if (msg.step === "plan") {
          hasPlan = true;
          // Mark analyze as done when we move to plan
          const analyzeBubble = newBubbles.find(b => b.id === "analyze");
          if (analyzeBubble) analyzeBubble.status = "Done";
          
          if (!newBubbles.find(b => b.id === "plan")) {
            newBubbles.push({
              id: "plan",
              title: "Plan architecture",
              status: "In progress",
              description: "Planning Web3 design system and component structure",
              actions: ["Apply modern UI principles", "Plan component hierarchy", "Define styling approach"],
              details: [msg.message],
              timestamp
            });
            currentStep = "Planning architecture";
            currentProgress = Math.max(currentProgress, 3);
          }
        } else if (msg.step === "dependencies") {
          hasDeps = true;
          // Mark plan as done when we move to dependencies
          const planBubble = newBubbles.find(b => b.id === "plan");
          if (planBubble) planBubble.status = "Done";
          
          if (!newBubbles.find(b => b.id === "deps")) {
            newBubbles.push({
              id: "deps",
              title: "Install dependencies",
              status: "In progress",
              description: "Installing required packages and dependencies",
              actions: ["Install Next.js and React", "Setup Tailwind CSS", "Configure TypeScript"],
              details: [msg.message],
              timestamp
            });
            currentStep = "Installing dependencies";
            currentProgress = Math.max(currentProgress, 4);
          } else {
            const bubble = newBubbles.find(b => b.id === "deps");
            if (bubble && bubble.details) {
              bubble.details.push(msg.message);
              if (msg.message.includes("installed") || msg.message.includes("DEPS_DONE")) {
                bubble.status = "Done";
              }
            }
          }
        } else if (msg.step === "server") {
          hasServer = true;
          // Mark deps and generate as done when we move to server
          const depsBubble = newBubbles.find(b => b.id === "deps");
          if (depsBubble) depsBubble.status = "Done";
          const generateBubble = newBubbles.find(b => b.id === "generate");
          if (generateBubble) generateBubble.status = "Done";
          
          if (!newBubbles.find(b => b.id === "server")) {
            newBubbles.push({
              id: "server",
              title: "Start dev server",
              status: "In progress",
              description: "Starting development server and preparing preview",
              actions: ["Configure dev server", "Find available port", "Start Next.js"],
              details: [msg.message],
              timestamp
            });
            currentStep = "Starting development server";
            currentProgress = Math.max(currentProgress, 6);
          } else {
            const bubble = newBubbles.find(b => b.id === "server");
            if (bubble && bubble.details) {
              bubble.details.push(msg.message);
              if (msg.message.includes("running") || msg.message.includes("SERVER_READY")) {
                bubble.status = "Done";
                currentProgress = Math.max(currentProgress, 7);
              }
            }
          }
        } else {
          // Handle any unstructured progress messages
          if (msg.message && (msg.message.includes("generation") || msg.message.includes("Claude") || msg.message.includes("Starting"))) {
            if (!newBubbles.find(b => b.id === "generate")) {
              newBubbles.push({
                id: "generate",
                title: "Generate code",
                status: "In progress", 
                description: "Creating pages and components with modern Web3 design",
                actions: ["Generate Next.js pages", "Apply Web3 UI principles", "Create components"],
                details: [msg.message],
                timestamp
              });
              currentStep = "Generating code with Claude";
              currentProgress = 5;
            }
          }
        }
      } else if (msg.type === "claude_message") {
        console.log('[PROGRESS DEBUG] Claude message:', msg.content?.substring(0, 100));
        // Mark previous steps as done and update generate bubble
        if (msg.content && msg.content.length > 10) {
          // Ensure we have a generate bubble for Claude messages
          if (!newBubbles.find(b => b.id === "generate")) {
            newBubbles.push({
              id: "generate",
              title: "Generate code",
              status: "In progress", 
              description: "Creating pages and components with modern Web3 design",
              actions: ["Generate Next.js pages", "Apply Web3 UI principles", "Create components"],
              details: [`Claude: ${msg.content.substring(0, 100)}...`],
              timestamp
            });
            currentStep = "Generating code with Claude";
            currentProgress = Math.max(currentProgress, 5);
          } else {
            const generateBubble = newBubbles.find(b => b.id === "generate");
            if (generateBubble && generateBubble.details) {
              generateBubble.details.push(`Claude: ${msg.content.substring(0, 100)}...`);
            }
          }
        }
      } else if (msg.type === "tool_use") {
        console.log('[PROGRESS DEBUG] Tool use:', msg.name, msg.input?.file_path);
        // Map tool uses to appropriate bubbles
        if (msg.name === "Write" || msg.name === "MultiEdit" || msg.name === "Edit") {
          let generateBubble = newBubbles.find(b => b.id === "generate");
          if (!generateBubble) {
            // Create generate bubble if it doesn't exist
            generateBubble = {
              id: "generate",
              title: "Generate code",
              status: "In progress", 
              description: "Creating pages and components with modern Web3 design",
              actions: ["Generate Next.js pages", "Apply Web3 UI principles", "Create components"],
              details: [],
              timestamp
            };
            newBubbles.push(generateBubble);
          }
          
          generateBubble.status = "In progress";
          generateBubble.details = generateBubble.details || [];
          generateBubble.details.push(`${msg.name}: ${msg.input?.file_path || 'files'}`);
          currentStep = "Writing code files";
          currentProgress = Math.max(currentProgress, 6);
        }
      }
    });

    // Handle completion
    if (!isGenerating && msgs.length > 0) {
      // Mark recent bubbles as done
      newBubbles.forEach(bubble => {
        if (bubble.status === "In progress") {
          bubble.status = "Done";
        }
      });
      currentStep = "Generation complete";
      currentProgress = totalSteps;
    }

    // Handle errors
    if (error) {
      newBubbles.push({
        id: "error",
        title: "Issue detected",
        status: "Error",
        description: "An error occurred during generation",
        actions: ["Check configuration", "Retry generation"],
        details: [error],
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      });
    }

    console.log('[PROGRESS DEBUG] Final state:', {
      bubbles: newBubbles.length,
      currentStep,
      currentProgress,
      totalSteps,
      percent: Math.round((currentProgress / totalSteps) * 100)
    });
    
    setBubbles(newBubbles);
    setHeader(prev => ({
      ...prev,
      currentStep,
      progress: {
        current: currentProgress,
        total: totalSteps,
        percent: Math.round((currentProgress / totalSteps) * 100)
      }
    }));
  };

  const getStatusIcon = (status: ProgressBubble['status']) => {
    switch (status) {
      case "Done": return "🟢";
      case "In progress": return "🔵";
      case "Error": return "🔴";
      case "Queued": return "⚪";
      case "Skipped": return "⚫";
      default: return "🔵";
    }
  };

  const getProgressBar = () => {
    const { current, total } = header.progress;
    const filled = Math.floor((current / total) * 10);
    const empty = 10 - filled;
    return "▓".repeat(filled) + "▒".repeat(empty);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
      {/* Debug Panel */}
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-2 text-xs">
        <strong>DEBUG:</strong> Messages: {messages.length} | Bubbles: {bubbles.length} | Progress: {header.progress.current}/{header.progress.total}
        <br />
        <strong>Last msg:</strong> {messages[messages.length - 1]?.type} - {messages[messages.length - 1]?.step || 'no-step'} - {(messages[messages.length - 1]?.message || messages[messages.length - 1]?.content || '').substring(0, 50)}...
      </div>
      
      {/* Header */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-2">✨ Task</h2>
        <p className="text-gray-300 mb-2">{header.task}</p>
        <p className="text-gray-400 text-xs mb-3">
          {new Date().toLocaleDateString()}, {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })} • 
          Environment: {header.environment} • 
          Project: {header.project}
        </p>
        
        <div className="space-y-1">
          <p className="text-white"><strong>Now:</strong> {header.currentStep}</p>
          <p className="text-white">
            <strong>Progress:</strong> {header.progress.current}/{header.progress.total} {getProgressBar()} ({header.progress.percent}%)
          </p>
        </div>
      </div>

      {/* Bubbles */}
      {bubbles.map((bubble) => (
        <div key={bubble.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-white font-semibold mb-2">
            {getStatusIcon(bubble.status)} {bubble.title} · {bubble.timestamp}
          </h3>
          
          <div className="space-y-2 text-sm">
            <p className="text-gray-300">
              <strong>Status:</strong> <span className={`${
                bubble.status === "Done" ? "text-green-400" :
                bubble.status === "Error" ? "text-red-400" :
                bubble.status === "In progress" ? "text-blue-400" :
                "text-gray-400"
              }`}>{bubble.status}</span>
            </p>
            
            <p className="text-gray-300">
              <strong>What this is:</strong> {bubble.description}
            </p>
            
            {bubble.actions.length > 0 && (
              <div className="text-gray-300">
                <strong>Actions:</strong>
                <ul className="ml-4 mt-1">
                  {bubble.actions.map((action, i) => (
                    <li key={i} className="text-gray-400">- {action}</li>
                  ))}
                </ul>
              </div>
            )}

            {bubble.details && bubble.details.length > 0 && (
              <details className="mt-2">
                <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                  Technical details
                </summary>
                <div className="mt-2 ml-4 text-gray-500 text-xs space-y-1">
                  {bubble.details.map((detail, i) => (
                    <p key={i}>- {detail}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      ))}

      {/* Loading state */}
      {isGenerating && bubbles.length === 0 && (
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
          <h3 className="text-white font-semibold mb-2">🔵 Initializing · {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}</h3>
          <div className="space-y-2 text-sm">
            <p className="text-blue-400"><strong>Status:</strong> In progress</p>
            <p className="text-gray-300"><strong>What this is:</strong> Setting up the generation environment</p>
            <div className="text-gray-300">
              <strong>Actions:</strong>
              <ul className="ml-4 mt-1">
                <li className="text-gray-400">- Connecting to Claude Code</li>
                <li className="text-gray-400">- Preparing workspace</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}