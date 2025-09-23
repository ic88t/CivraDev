"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

interface CreditData {
  messageCreditsRemaining: number;
  plan: string;
}

export default function CreditDisplay() {
  const [credits, setCredits] = useState<CreditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchCredits();

  // Realtime subscriptions for instant updates
  let cleanup: (() => void) | undefined;
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase
      .channel(`credits-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_balances', filter: `user_id=eq.${user.id}` }, () => fetchCredits())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions', filter: `user_id=eq.${user.id}` }, () => fetchCredits())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` }, () => fetchCredits())
      .subscribe();

    cleanup = () => { supabase.removeChannel(channel); };
  })();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      fetchCredits();
    } else {
      setCredits(null);
    }
  });

  const interval = setInterval(fetchCredits, 30000);

  return () => {
    subscription.unsubscribe();
    clearInterval(interval);
    if (cleanup) cleanup();
  };
}, []);

  const fetchCredits = async () => {
    try {
      console.log('[CreditDisplay] Starting to fetch credits...');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log('[CreditDisplay] No session found, showing default credits');
        // Show default free tier credits when not authenticated
        setCredits({
          messageCreditsRemaining: 10,
          plan: 'FREE'
        });
        setLoading(false);
        return;
      }

      console.log('[CreditDisplay] Making API request to /api/usage...');
      const response = await fetch('/api/usage', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('[CreditDisplay] API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[CreditDisplay] API response data:', data);
        setCredits({
          messageCreditsRemaining: data.messageCreditsRemaining !== undefined ? data.messageCreditsRemaining : 10,
          plan: data.plan || 'FREE'
        });
        setError(null);
      } else {
        console.error('[CreditDisplay] API error:', response.status, response.statusText);
        // Don't override existing credits on API error, just set error
        setError(`API Error: ${response.status}`);
        // Only set default if we have no credits at all
        if (!credits) {
          setCredits({
            messageCreditsRemaining: 10,
            plan: 'FREE'
          });
        }
      }
    } catch (error) {
      console.error('[CreditDisplay] Error fetching credits:', error);
      // Don't override existing credits on fetch error, just set error
      setError('Network Error');
      // Only set default if we have no credits at all
      if (!credits) {
        setCredits({
          messageCreditsRemaining: 10,
          plan: 'FREE'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Always show something, even if loading
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  // Show credits even if there was an error (only fallback if no credits data at all)
  const { messageCreditsRemaining, plan } = credits || { messageCreditsRemaining: 0, plan: 'FREE' };

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className={`w-2 h-2 rounded-full ${
        messageCreditsRemaining <= 0 ? 'bg-red-400' :
        messageCreditsRemaining <= 3 ? 'bg-yellow-400' :
        'bg-green-400'
      }`}></div>
      <span className="text-sm text-gray-300">
        {messageCreditsRemaining} credits
      </span>
      {plan === 'FREE' && (
        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
          FREE
        </span>
      )}
      {error && (
        <span className="text-xs text-red-400" title={error}>
          !
        </span>
      )}
    </div>
  );
}
