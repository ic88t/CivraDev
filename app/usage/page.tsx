"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface UsageData {
  timeframe: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    projectsCreated: {
      used: number;
      limit: number;
      percentage: number;
    };
    chatMessages: {
      used: number;
      limit: number;
      percentage: number;
    };
    previewGenerations: {
      used: number;
      limit: number;
      percentage: number;
    };
    deployments: {
      used: number;
      limit: number;
      percentage: number;
    };
  };
  usage: {
    recent: Array<{
      id: string;
      type: string;
      amount: number;
      createdAt: string;
      details?: any;
    }>;
  };
}

export default function UsagePage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const router = useRouter();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    // Simulate loading some usage data
    fetchUsage();
  }, [timeframe]);

  const fetchUsage = async () => {
    try {
      setLoading(true);

      // Mock usage data
      const mockData = {
        timeframe: timeframe,
        period: {
          start: "2024-01-01",
          end: "2024-01-31"
        },
        summary: {
          projectsCreated: { used: 3, limit: 10, percentage: 30 },
          chatMessages: { used: 45, limit: 100, percentage: 45 },
          previewGenerations: { used: 12, limit: 50, percentage: 24 },
          deployments: { used: 2, limit: 5, percentage: 40 }
        },
        usage: {
          recent: [
            { id: "1", type: "PROJECT_CREATION", amount: 1, createdAt: "2024-01-15T10:30:00Z", details: { prompt: "NFT Marketplace" } },
            { id: "2", type: "CHAT_MESSAGE", amount: 1, createdAt: "2024-01-14T15:20:00Z" },
            { id: "3", type: "PREVIEW_GENERATION", amount: 1, createdAt: "2024-01-13T09:15:00Z" }
          ]
        }
      };

      setUsageData(mockData);
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatUsageType = (type: string) => {
    switch (type) {
      case "PROJECT_CREATION":
        return "Project Created";
      case "CHAT_MESSAGE":
        return "Chat Message";
      case "PREVIEW_GENERATION":
        return "Preview Generated";
      case "DEPLOYMENT":
        return "Deployment";
      default:
        return type.replace("_", " ");
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="pt-20 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Usage & Billing</h1>
            <p className="text-gray-400">
              Track your Civra usage and manage your subscription
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-sm">Period:</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          {usageData && (
            <>
              {/* Usage Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-300 text-sm font-medium">Projects</h3>
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-white">
                      {usageData.summary.projectsCreated.used}
                    </div>
                    <div className="text-sm text-gray-400">
                      of {usageData.summary.projectsCreated.limit} included
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(usageData.summary.projectsCreated.percentage)}`}
                      style={{ width: `${Math.min(usageData.summary.projectsCreated.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-300 text-sm font-medium">Chat Messages</h3>
                    <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-white">
                      {usageData.summary.chatMessages.used}
                    </div>
                    <div className="text-sm text-gray-400">
                      of {usageData.summary.chatMessages.limit} included
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(usageData.summary.chatMessages.percentage)}`}
                      style={{ width: `${Math.min(usageData.summary.chatMessages.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-300 text-sm font-medium">Previews</h3>
                    <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-white">
                      {usageData.summary.previewGenerations.used}
                    </div>
                    <div className="text-sm text-gray-400">
                      of {usageData.summary.previewGenerations.limit} included
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(usageData.summary.previewGenerations.percentage)}`}
                      style={{ width: `${Math.min(usageData.summary.previewGenerations.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-300 text-sm font-medium">Deployments</h3>
                    <div className="w-8 h-8 bg-orange-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-white">
                      {usageData.summary.deployments.used}
                    </div>
                    <div className="text-sm text-gray-400">
                      of {usageData.summary.deployments.limit} included
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(usageData.summary.deployments.percentage)}`}
                      style={{ width: `${Math.min(usageData.summary.deployments.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {usageData.usage.recent.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400">
                      No usage data for the selected period
                    </div>
                  ) : (
                    usageData.usage.recent.map((item) => (
                      <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-white font-medium">
                            {formatUsageType(item.type)}
                          </div>
                          {item.details?.prompt && (
                            <div className="text-gray-400 text-sm truncate max-w-md">
                              {item.details.prompt}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-gray-300 text-sm">
                            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {item.amount} unit{item.amount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Billing Section */}
              <div className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Subscription</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Free Plan</div>
                    <div className="text-gray-400 text-sm">
                      10 projects, 100 messages, 50 previews per month
                    </div>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Upgrade Plan
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}