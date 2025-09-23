"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AnimatedText from "@/components/AnimatedText";
import TypewriterPlaceholder from "@/components/TypewriterPlaceholder";
import ShaderBackground from "@/components/ShaderBackground";
import UsageDashboard from "@/components/UsageDashboard";
import { supabase } from "@/lib/supabase-client";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("Claude Sonnet 4");
  const [autoMode, setAutoMode] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "projects">("create");
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [wakingProjects, setWakingProjects] = useState<Set<string>>(new Set());
  
  const modelOptions = [
    "Claude Sonnet 4",
    "Claude Opus 4.1"
  ];
  
  const placeholderText = TypewriterPlaceholder({
    baseText: "Ask Civra to create",
    products: [
      "an NFT marketplace.",
      "a DeFi protocol.", 
      "a DAO platform.",
      "a Web3 game.",
      "a DEX platform.",
      "a yield farming app.",
      "an NFT collection.",
      "a staking platform.",
      "a cross-chain bridge.",
      "a metaverse world."
    ],
    interval: 2000
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    // Navigate to generate page with prompt
    router.push(`/generate?prompt=${encodeURIComponent(prompt)}`);
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/projects', { headers });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        console.error('Failed to fetch projects:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const wakeUpSandbox = async (sandboxId: string, projectId?: string) => {
    // Find the project to get both IDs
    const project = projects.find(p => p.sandboxId === sandboxId);
    const trackingId = projectId || project?.id || sandboxId;

    // Add to waking set using the tracking ID (project database ID)
    setWakingProjects(prev => new Set(Array.from(prev).concat([trackingId])));

    try {
      console.log(`🚀 [WAKE-UP] Starting wake-up process for sandbox: ${sandboxId} (project: ${trackingId})`);

      const response = await fetch('/api/projects/wake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId })
      });

      console.log(`📡 [WAKE-UP] API Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [WAKE-UP] API Response data:', data);

        // Update the project in the list with new status and preview URL using sandboxId
        setProjects(prev => prev.map(p =>
          p.sandboxId === sandboxId
            ? { ...p, status: data.status, previewUrl: data.previewUrl }
            : p
        ));
        return data.previewUrl;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [WAKE-UP] API Error response:', errorData);
      }
    } catch (error) {
      console.error('❌ [WAKE-UP] Failed to wake up sandbox:', error);
    } finally {
      // Remove from waking set using the tracking ID
      setWakingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackingId);
        return newSet;
      });
      console.log(`🏁 [WAKE-UP] Wake-up process completed for sandbox: ${sandboxId}`);
    }
    return null;
  };

  // Fetch projects when switching to projects tab
  const handleTabChange = (tab: "create" | "projects") => {
    setActiveTab(tab);
    if (tab === "projects") {
      fetchProjects();
    }
  };

  return (
    <ShaderBackground>
      {/* Navbar */}
      <Navbar />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Hero Section */}
          <h1 className="text-4xl sm:text-4xl md:text-6xl font-bold text-white mb-6">
            Build{" "}
            <AnimatedText
              texts={[
                "Web3",
                "NFT",
                "DeFi", 
                "DAO",
                "DEX",
                "GameFi",
                "SocialFi",
                "Staking",
                "Cross-chain",
                "Metaverse"
              ]}
              interval={5000}
              className=" bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 inline"
            />
            {" "}Apps in Minutes
          </h1>    

          <p className="text-xl sm:text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Turn your Web3 ideas into production-ready dApps in minutes. Powered by
            Claude's advanced AI capabilities and blockchain technology.
          </p>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-1 border border-gray-700">
              <button
                onClick={() => handleTabChange("create")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "create"
                    ? "bg-white text-black"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                Create New
              </button>
              <button
                onClick={() => handleTabChange("projects")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "projects"
                    ? "bg-white text-black"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                My Projects
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "create" ? (
            <div className="relative max-w-2xl mx-auto">
              <div className="relative bg-black rounded-2xl border border-gray-800 shadow-2xl">
              {/* Input Area */}
              <div className="flex flex-col">
                {/* Main input area */}
                <div className="flex items-center px-2">
                  {/* Textarea */}
                  <textarea
                    placeholder={placeholderText}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    className="flex-1 px-5 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg resize-none min-h-[120px] max-h-[300px]"
                    rows={3}
                  />

                  {/* Send button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="flex-shrink-0 mr-3 p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                  >
                {false ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 group-hover:scale-110 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                )}
                  </button>
                </div>
                
                {/* Bottom bar with model selector */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                  <div className="flex items-center gap-4">
                    {/* Auto toggle */}
                    <button 
                      onClick={() => setAutoMode(!autoMode)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-1 text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Auto</span>
                      </div>
                    </button>
                    
                    {/* Model selector */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowModelDropdown(!showModelDropdown)}
                        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>{selectedModel}</span>
                        <svg className={`w-3 h-3 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {/* Dropdown */}
                      {showModelDropdown && (
                        <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[200px] z-50">
                          {modelOptions.map((model) => (
                            <button
                              key={model}
                              onClick={() => {
                                setSelectedModel(model);
                                setShowModelDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                selectedModel === model ? 'text-white bg-gray-800' : 'text-gray-300'
                              }`}
                            >
                              {model}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Example prompts */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() =>
                  setPrompt(
                    "Create an NFT marketplace with minting, buying, and selling functionality"
                  )
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                NFT Marketplace
              </button>
              <button
                onClick={() =>
                  setPrompt("Build a DeFi yield farming platform with staking rewards")
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                DeFi Platform
              </button>
              <button
                onClick={() =>
                  setPrompt(
                    "Create a DAO governance platform with voting and proposal systems"
                  )
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                DAO Platform
              </button>
              <button
                onClick={() =>
                  setPrompt(
                    "Build a Web3 game with NFT characters and play-to-earn mechanics"
                  )
                }
                className="px-4 py-2 text-sm text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-full hover:bg-gray-700/50 transition-colors border border-gray-700"
              >
                Web3 Game
              </button>
            </div>
            </div>
          ) : activeTab === "projects" ? (
            /* Projects Tab */
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-4 gap-6">
                {/* Usage Dashboard */}
                <div className="lg:col-span-1">
                  <UsageDashboard />
                </div>
                
                {/* Projects List */}
                <div className="lg:col-span-3">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="ml-3 text-gray-300">Loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                  <p className="text-gray-400 mb-6">Create your first Web3 app to get started</p>
                  <button
                    onClick={() => handleTabChange("create")}
                    className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Create New Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{project.name || 'Unnamed Project'}</h3>
                            <p className="text-gray-400 text-sm">{project.description || project.prompt}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          project.status === 'running' || project.status === 'active'
                            ? 'bg-green-900/30 text-green-300' 
                            : project.status === 'stopped' || project.status === 'inactive'
                            ? 'bg-yellow-900/30 text-yellow-300'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          {project.status === 'stopped' ? 'Sleeping' : project.status || 'Unknown'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>
                        <div className="flex gap-2">
                          {project.status === 'stopped' || project.status === 'inactive' ? (
                            <>
                              <button
                                onClick={async () => {
                                  const newPreviewUrl = await wakeUpSandbox(project.sandboxId, project.id);
                                  if (newPreviewUrl) {
                                    window.open(newPreviewUrl, '_blank');
                                  }
                                }}
                                disabled={wakingProjects.has(project.id)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  wakingProjects.has(project.id)
                                    ? 'bg-yellow-400 text-yellow-900 cursor-not-allowed'
                                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                }`}
                              >
                                {wakingProjects.has(project.id) ? 'Waking Up...' : 'Wake & Preview'}
                              </button>
                              <button
                                onClick={async () => {
                                  console.log(`🔧 [FORCE-START] Attempting force start for: ${project.id}`);
                                  try {
                                    const response = await fetch('/api/projects/force-start', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ sandboxId: project.id })
                                    });
                                    const data = await response.json();
                                    console.log(`🔧 [FORCE-START] Response:`, data);
                                    
                                    if (data.success && data.previewUrl) {
                                      window.open(data.previewUrl, '_blank');
                                    }
                                  } catch (error) {
                                    console.error(`🔧 [FORCE-START] Error:`, error);
                                  }
                                }}
                                disabled={wakingProjects.has(project.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:bg-red-400"
                              >
                                Force Start
                              </button>
                            </>
                          ) : project.previewUrl ? (
                            <a
                              href={project.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                            >
                              Preview
                            </a>
                          ) : (
                            <span className="px-3 py-1 bg-gray-700 text-gray-500 rounded-lg text-sm">
                              No Preview
                            </span>
                          )}
                          <button
                            onClick={async () => {
                              // If sandbox is sleeping, wake it up first
                              if (project.status === 'stopped' || project.status === 'inactive') {
                                await wakeUpSandbox(project.sandboxId, project.id);
                              }
                              // Navigate to continue chat
                              router.push(`/generate?sandboxId=${project.sandboxId}&continue=true`);
                            }}
                            disabled={wakingProjects.has(project.id)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              wakingProjects.has(project.id)
                                ? 'bg-purple-400 text-purple-900 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            {wakingProjects.has(project.id) ? 'Starting...' : 'Continue'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </div>
              </div>
            </div>
          ) : (
            /* Projects Tab */
            <div className="max-w-4xl mx-auto">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="ml-3 text-gray-300">Loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                  <p className="text-gray-400 mb-6">Start building your first Web3 application</p>
                  <button
                    onClick={() => handleTabChange("create")}
                    className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Create New Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{project.name || 'Untitled Project'}</h3>
                            <p className="text-sm text-gray-400">{project.description || 'Web3 Application'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>
                        <div className="flex gap-2">
                          {project.status === 'stopped' || project.status === 'inactive' ? (
                            <>
                              <button
                                onClick={async () => {
                                  const newPreviewUrl = await wakeUpSandbox(project.sandboxId, project.id);
                                  if (newPreviewUrl) {
                                    window.open(newPreviewUrl, '_blank');
                                  }
                                }}
                                disabled={wakingProjects.has(project.id)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  wakingProjects.has(project.id)
                                    ? 'bg-yellow-400 text-yellow-900 cursor-not-allowed'
                                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                                }`}
                              >
                                {wakingProjects.has(project.id) ? 'Waking Up...' : 'Wake & Preview'}
                              </button>
                              <button
                                onClick={async () => {
                                  console.log(`🔧 [FORCE-START] Attempting force start for: ${project.id}`);
                                  try {
                                    const response = await fetch('/api/projects/force-start', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ sandboxId: project.id })
                                    });
                                    const data = await response.json();
                                    console.log(`🔧 [FORCE-START] Response:`, data);
                                    
                                    if (data.success && data.previewUrl) {
                                      window.open(data.previewUrl, '_blank');
                                    }
                                  } catch (error) {
                                    console.error(`🔧 [FORCE-START] Error:`, error);
                                  }
                                }}
                                disabled={wakingProjects.has(project.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:bg-red-400"
                              >
                                Force Start
                              </button>
                            </>
                          ) : project.previewUrl ? (
                            <a
                              href={project.previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                            >
                              Preview
                            </a>
                          ) : (
                            <span className="px-3 py-1 bg-gray-700 text-gray-500 rounded-lg text-sm">
                              No Preview
                            </span>
                          )}
                          <button
                            onClick={async () => {
                              // If sandbox is sleeping, wake it up first
                              if (project.status === 'stopped' || project.status === 'inactive') {
                                await wakeUpSandbox(project.sandboxId, project.id);
                              }
                              // Navigate to continue chat
                              router.push(`/generate?sandboxId=${project.sandboxId}&continue=true`);
                            }}
                            disabled={wakingProjects.has(project.id)}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                              wakingProjects.has(project.id)
                                ? 'bg-purple-400 text-purple-900 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                          >
                            {wakingProjects.has(project.id) ? 'Starting...' : 'Continue'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description Section */}
      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                  Consider yourself limitless.
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  If you can describe it, you can build it.
                </p>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">
                  Create at the speed of thought
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Tell Claude your Web3 idea, and watch it transform into a working dApp—complete with all the necessary smart contracts, frontend components, blockchain integrations, and DeFi features.
                </p>
                <button className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Start building
                </button>
              </div>
            </div>

            {/* Right Content - Showcase */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                {/* Mock App Interface */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <span className="text-white font-semibold">DeFiTracker</span>
                    </div>
                  </div>

                  {/* Description Card */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600">
                    <p className="text-gray-300 text-sm mb-4">
                      Create an app that helps people keep track of their DeFi positions and alerts them to upcoming liquidations
                    </p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors">
                        + Add styling
                      </button>
                      <button className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors">
                        ✨ Improve prompt
                      </button>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="text-gray-400 text-xs mb-1">This Month</div>
                      <div className="text-2xl font-bold text-white">0.36</div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="text-gray-400 text-xs mb-1">Spent Last 12 Months</div>
                      <div className="text-2xl font-bold text-green-400">$1324.27</div>
                      <div className="text-green-400 text-xs">+3% vs year previous</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <h4 className="text-gray-300 font-medium">Recent Activity</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-400 text-sm">nutrition</span>
                        <span className="text-gray-300 text-sm">$19.99</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-400 text-sm">streaming</span>
                        <span className="text-gray-300 text-sm">$15.99</span>
                      </div>
                    </div>
                  </div>

                  {/* Overview Section */}
                  <div className="text-right">
                    <span className="text-gray-400 text-lg">Overview</span>
                  </div>
                </div>

                {/* Decorative cursor */}
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center transform rotate-12">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Showcase Section - NFT Marketplace */}
      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Right Content - Showcase (Image First) */}
            <div className="relative order-2 lg:order-1">
              <div className="bg-gradient-to-br from-green-900/50 to-blue-900/50 rounded-2xl p-8 border border-green-700/50 shadow-2xl">
                {/* Mock DAO Interface */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="text-white font-semibold">EcoDAO</span>
                    </div>
                    <div className="text-green-300 text-sm">1,247 members</div>
                  </div>

                  {/* Description Card */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-green-600/30">
                    <p className="text-gray-300 text-sm mb-4">
                      Create a DAO for environmental projects with proposal voting, fund allocation, and member governance
                    </p>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-green-700/50 text-green-300 rounded-lg text-xs hover:bg-green-600/50 transition-colors">
                        + Add treasury
                      </button>
                      <button className="px-3 py-1.5 bg-green-700/50 text-green-300 rounded-lg text-xs hover:bg-green-600/50 transition-colors">
                        🗳️ Setup voting
                      </button>
                    </div>
                  </div>

                  {/* Active Proposal */}
                  <div className="bg-green-800/20 rounded-xl p-4 border border-green-600/30">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-white font-medium text-sm">Proposal #12: Solar Farm Initiative</h4>
                      <span className="text-green-300 text-xs bg-green-700/30 px-2 py-1 rounded">Active</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Yes: 847 votes (68%)</span>
                        <span className="text-gray-400">No: 400 votes (32%)</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{width: '68%'}}></div>
                      </div>
                      <div className="text-xs text-gray-400">2 days remaining</div>
                    </div>
                  </div>

                  {/* Treasury Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="text-gray-400 text-xs mb-1">Treasury Balance</div>
                      <div className="text-2xl font-bold text-green-400">$2.4M</div>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <div className="text-gray-400 text-xs mb-1">Active Proposals</div>
                      <div className="text-2xl font-bold text-blue-400">7</div>
                    </div>
                  </div>
                </div>

                {/* Decorative element */}
                <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center transform -rotate-12">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Left Content */}
            <div className="space-y-8 order-1 lg:order-2">
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                  Govern together, build better.
                </h2>
                <p className="text-xl text-gray-300 mb-8">
                  Launch DAOs with transparent voting and treasury management.
                </p>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">
                  Democratic Web3 organizations
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Build decentralized autonomous organizations with proposal systems, token-based voting, treasury management, and governance mechanisms that scale with your community.
                </p>
                <button className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all">
                  Launch DAO
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">Ready to build the future?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers already building Web3 applications with AI-powered tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-black px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg">
              Start Building Free
            </button>
            <a 
              href="/pricing" 
              className="border border-gray-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-lg"
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </ShaderBackground>
  );
}
