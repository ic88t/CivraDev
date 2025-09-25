import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth-utils";
import { getCreditUsageStats, getUserPlan, getProjectLimits } from "@/lib/credits";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // console.log('[Usage API] Starting request...');
    
    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      // console.log('[Usage API] No user from request, trying getCurrentUser...');
      user = await getCurrentUser();
    }

    if (!user?.email) {
      // console.log('[Usage API] No authenticated user found');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // console.log(`[Usage API] Fetching usage stats for user: ${user.email} (ID: ${user.id})`);

    // Get usage statistics with error handling
    // console.log('[Usage API] Calling getCreditUsageStats...');
    const usageStats = await getCreditUsageStats(user.id);
    if (!usageStats) {
      // console.error('[Usage API] getCreditUsageStats returned null');
      // Return default values instead of failing
      const defaultStats = {
        credits: {
          message_credits: 10,
          integration_credits: 100,
          message_credits_used: 0,
          integration_credits_used: 0,
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        usage: [],
        messageCreditsRemaining: 10,
        integrationCreditsRemaining: 100,
        messageCreditsPercentUsed: 0,
        integrationCreditsPercentUsed: 0
      };
      
      return new Response(
        JSON.stringify({
          ...defaultStats,
          plan: 'FREE',
          projectLimits: {
            currentCount: 0,
            limit: 3,
            canCreate: true
          },
          user: {
            id: user.id,
            email: user.email
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Get user's plan
    // console.log('[Usage API] Calling getUserPlan...');
    const plan = await getUserPlan(user.id);
    // console.log(`[Usage API] User plan: ${plan}`);

    // Get project limits (especially for free users)
    // console.log('[Usage API] Calling getProjectLimits...');
    const projectLimits = await getProjectLimits(user.id);
    // console.log(`[Usage API] Project limits:`, projectLimits);

    const response = {
      ...usageStats,
      plan: plan,
      projectLimits: projectLimits,
      user: {
        id: user.id,
        email: user.email
      }
    };

    // console.log('[Usage API] Returning successful response');
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    // console.error("[Usage API] Error:", error);
    // console.error("[Usage API] Error stack:", error.stack);
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to fetch usage statistics",
        details: error.stack ? error.stack.split('\n')[0] : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}