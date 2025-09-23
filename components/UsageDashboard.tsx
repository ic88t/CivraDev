"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

interface CreditBalance {
  message_credits: number;
  integration_credits: number;
  message_credits_used: number;
  integration_credits_used: number;
  billing_period_start: string;
  billing_period_end: string;
}

interface UsageStats {
  credits: CreditBalance;
  messageCreditsRemaining: number;
  integrationCreditsRemaining: number;
  messageCreditsPercentUsed: number;
  integrationCreditsPercentUsed: number;
  plan: string;
  projectLimits?: {
    currentCount: number;
    limit: number;
    canCreate: boolean;
  };
}

export default function UsageDashboard() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch('/api/usage', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }

      const data = await response.json();
      setUsageStats(data);
    } catch (err: any) {
      console.error('Error fetching usage stats:', err);
      setError(err.message || 'Failed to load usage statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !usageStats) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
        <div className="flex items-center gap-2 text-red-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Unable to load usage statistics</span>
        </div>
        {error && <p className="text-red-300 text-sm mt-2">{error}</p>}
        <button 
          onClick={fetchUsageStats}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { credits, messageCreditsRemaining, integrationCreditsRemaining, messageCreditsPercentUsed, integrationCreditsPercentUsed, plan, projectLimits } = usageStats;

  const billingPeriodEnd = new Date(credits.billing_period_end);
  const daysRemaining = Math.max(0, Math.ceil((billingPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Usage Dashboard</h3>
        <div className="text-sm text-gray-400">
          {daysRemaining} days remaining
        </div>
      </div>

      <div className="space-y-6">
        {/* Message Credits */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Message Credits</span>
            <span className="text-sm text-gray-400">
              {messageCreditsRemaining} / {credits.message_credits} remaining
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                messageCreditsPercentUsed >= 90 ? 'bg-red-500' :
                messageCreditsPercentUsed >= 70 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, messageCreditsPercentUsed)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Used: {credits.message_credits_used}</span>
            <span>{messageCreditsPercentUsed.toFixed(1)}% used</span>
          </div>
        </div>

        {/* Project Limits (Free Plan Only) */}
        {plan === 'FREE' && projectLimits && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Projects</span>
              <span className="text-sm text-gray-400">
                {projectLimits.currentCount} / {projectLimits.limit} used
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  projectLimits.currentCount >= projectLimits.limit ? 'bg-red-500' :
                  projectLimits.currentCount >= projectLimits.limit * 0.8 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (projectLimits.currentCount / projectLimits.limit) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Projects: {projectLimits.currentCount}</span>
              <span>{((projectLimits.currentCount / projectLimits.limit) * 100).toFixed(1)}% used</span>
            </div>
            {!projectLimits.canCreate && (
              <div className="mt-2 text-xs text-red-400">
                Project limit reached. Upgrade to create more projects.
              </div>
            )}
          </div>
        )}

        {/* Integration Credits */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Integration Credits</span>
            <span className="text-sm text-gray-400">
              {integrationCreditsRemaining} / {credits.integration_credits} remaining
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                integrationCreditsPercentUsed >= 90 ? 'bg-red-500' :
                integrationCreditsPercentUsed >= 70 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, integrationCreditsPercentUsed)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Used: {credits.integration_credits_used}</span>
            <span>{integrationCreditsPercentUsed.toFixed(1)}% used</span>
          </div>
        </div>

        {/* Credit Usage Warnings */}
        {(messageCreditsPercentUsed >= 80 || integrationCreditsPercentUsed >= 80) && (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-yellow-400 font-medium text-sm">Credit Usage Warning</h4>
                <p className="text-yellow-300 text-sm mt-1">
                  You&apos;re running low on credits. Consider upgrading your plan to avoid interruptions.
                </p>
                <a 
                  href="/pricing"
                  className="inline-block mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
                >
                  Upgrade Plan
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Out of Credits */}
        {(messageCreditsRemaining <= 0 || integrationCreditsRemaining <= 0) && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-red-400 font-medium text-sm">Credits Exhausted</h4>
                <p className="text-red-300 text-sm mt-1">
                  You&apos;ve used all your {messageCreditsRemaining <= 0 ? 'message' : 'integration'} credits for this billing period. 
                  Upgrade your plan to continue using the platform.
                </p>
                <a 
                  href="/pricing"
                  className="inline-block mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                >
                  Upgrade Now
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <button 
          onClick={fetchUsageStats}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          Refresh Usage Stats
        </button>
      </div>
    </div>
  );
}
