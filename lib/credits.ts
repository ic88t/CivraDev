import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Create server-side Supabase client
function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'BUILDER' | 'PRO' | 'ELITE';
export type CreditType = 'message' | 'integration';

export interface CreditBalance {
  message_credits: number;
  integration_credits: number;
  message_credits_used: number;
  integration_credits_used: number;
  billing_period_start: string;
  billing_period_end: string;
}

export interface PlanLimits {
  message_limit: number;
  integration_limit: number;
  price: number;
  features: string[];
}

// Plan configurations matching your pricing page
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    message_limit: 10,
    integration_limit: 100,
    price: 0,
    features: ['Community support', 'Basic smart contracts', '3 projects max']
  },
  STARTER: {
    message_limit: 100,
    integration_limit: 2000,
    price: 16,
    features: ['Unlimited dApps', 'Code editing', 'Smart contracts', 'Custom domain', 'GitHub integration']
  },
  BUILDER: {
    message_limit: 250,
    integration_limit: 10000,
    price: 40,
    features: ['Advanced DeFi protocols', 'Multi-chain support', 'NFT marketplace tools', 'DAO governance', 'Priority support']
  },
  PRO: {
    message_limit: 500,
    integration_limit: 20000,
    price: 80,
    features: ['Custom smart contracts', 'Cross-chain bridges', 'Yield farming protocols', 'Beta features access', 'Premium support']
  },
  ELITE: {
    message_limit: 1200,
    integration_limit: 50000,
    price: 160,
    features: ['Custom AI models', 'On-premise deployment', 'Dedicated support team', 'SLA guarantees', 'White-label solutions']
  }
};

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<CreditBalance | null> {
  try {
    const supabase = createSupabaseServer();
    
    const { data, error } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user credits:', error);
      
      // If table doesn't exist or no record found, handle appropriately
      if (error.code === 'PGRST116') {
        if (error.message?.includes('relation "credit_balances" does not exist')) {
          console.log('Credit balances table not found, returning default values');
        } else {
          console.log('No credit balance found for user, attempting to initialize');
          // Try to initialize credits for this user
          try {
            await supabase.rpc('reset_monthly_credits', { user_id_param: userId });
            console.log('Initialized credits for user, retrying fetch');
            // Retry the fetch
            const { data: retryData, error: retryError } = await supabase
              .from('credit_balances')
              .select('*')
              .eq('user_id', userId)
              .single();
            if (retryData && !retryError) {
              return retryData;
            }
          } catch (initError) {
            console.error('Failed to initialize credits:', initError);
          }
        }
        
        return {
          message_credits: 10,
          integration_credits: 100,
          message_credits_used: 0,
          integration_credits_used: 0,
          billing_period_start: new Date().toISOString(),
          billing_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
      }
      
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserCredits:', error);
    return null;
  }
}

/**
 * Get user's subscription plan
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  try {
    const supabase = createSupabaseServer();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user plan:', error);
      
      // If subscriptions table doesn't exist, default to FREE
      if (error?.code === 'PGRST116') {
        if (error?.message?.includes('relation "subscriptions" does not exist')) {
          console.log('Subscriptions table not found, defaulting to FREE plan');
        } else {
          console.log('No subscription record found for user, defaulting to FREE plan');
          // Try to create a subscription record for this user
          try {
            await supabase
              .from('subscriptions')
              .insert([{ user_id: userId, plan: 'FREE', status: 'ACTIVE' }]);
            console.log('Created FREE subscription for user');
          } catch (insertError) {
            console.error('Failed to create subscription:', insertError);
          }
        }
      }
      
      return 'FREE'; // Default to free plan
    }

    return data.plan as SubscriptionPlan;
  } catch (error) {
    console.error('Error in getUserPlan:', error);
    return 'FREE';
  }
}

/**
 * Check if user has sufficient credits
 */
export async function hasCredits(
  userId: string, 
  creditType: CreditType, 
  amount: number = 1
): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) return false;

    const available = creditType === 'message' 
      ? credits.message_credits - credits.message_credits_used
      : credits.integration_credits - credits.integration_credits_used;

    return available >= amount;
  } catch (error) {
    console.error('Error checking credits:', error);
    return false;
  }
}

/**
 * Consume credits for a user action
 */
export async function consumeCredits(
  userId: string,
  creditType: CreditType,
  amount: number = 1,
  description?: string,
  usageId?: string
): Promise<boolean> {
  try {
    const supabase = createSupabaseServer();
    
    // Use the database function to consume credits atomically
    const { data, error } = await supabase.rpc('consume_credits', {
      user_id_param: userId,
      credit_type_param: creditType,
      amount_param: amount,
      description_param: description || null,
      usage_id_param: usageId || null
    });

    if (error) {
      console.error('Error consuming credits:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in consumeCredits:', error);
    return false;
  }
}

/**
 * Track usage and consume credits
 */
export async function trackUsageWithCredits(
  userId: string,
  usageType: 'PROJECT_CREATION' | 'CHAT_MESSAGE' | 'PREVIEW_GENERATION' | 'DEPLOYMENT',
  creditType: CreditType,
  amount: number = 1,
  details?: any,
  projectId?: string
): Promise<{ success: boolean; usageId?: string; error?: string }> {
  try {
    const supabase = createSupabaseServer();
    
    // First check if user has enough credits
    const hasEnough = await hasCredits(userId, creditType, amount);
    if (!hasEnough) {
      return { 
        success: false, 
        error: `Insufficient ${creditType} credits. Please upgrade your plan.` 
      };
    }

    // Create usage record
    let usageDataResult: { id: string } | null = null;
    let usageInsertError: any | null = null;

    // Attempt insert using the new schema (credits_consumed, project_id)
    {
      const { data, error } = await supabase
        .from('usage')
        .insert([
          {
            user_id: userId,
            type: usageType,
            credits_consumed: amount,
            details: details || {},
            project_id: projectId || null,
          },
        ])
        .select('id')
        .single();

      if (!error && data) {
        usageDataResult = data as { id: string };
      } else {
        usageInsertError = error;
      }
    }

    // Fallback: older schema uses 'amount' and may not have 'project_id'
    if (!usageDataResult) {
      console.warn('Usage insert failed with new schema, trying fallback...', usageInsertError?.message || usageInsertError);
      const { data, error } = await supabase
        .from('usage')
        .insert([
          {
            user_id: userId,
            type: usageType,
            amount: amount,
            details: details || {},
          },
        ])
        .select('id')
        .single();

      if (!error && data) {
        usageDataResult = data as { id: string };
      } else {
        console.error('Error creating usage record (both schemas failed):', usageInsertError, error);
        return { success: false, error: 'Failed to track usage' };
      }
    }

    // Consume credits
    const consumed = await consumeCredits(
      userId, 
      creditType, 
      amount, 
      `${usageType}: ${amount} ${creditType} credits`,
      usageDataResult.id
    );

    if (!consumed) {
      // Rollback usage record if credit consumption failed
      await supabase.from('usage').delete().eq('id', usageDataResult.id);
      return { success: false, error: 'Failed to consume credits' };
    }

    return { success: true, usageId: usageDataResult.id };
  } catch (error) {
    console.error('Error in trackUsageWithCredits:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Reset monthly credits (usually called by a cron job)
 */
export async function resetMonthlyCredits(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseServer();
    
    const { error } = await supabase.rpc('reset_monthly_credits', {
      user_id_param: userId
    });

    if (error) {
      console.error('Error resetting monthly credits:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in resetMonthlyCredits:', error);
    return false;
  }
}

/**
 * Check if user can create a new project (respects project limits)
 */
export async function canCreateProject(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseServer();
    
    const { data, error } = await supabase.rpc('can_create_project', {
      user_id_param: userId
    });

    if (error) {
      console.error('Error checking project limit:', error);
      
      // If the function doesn't exist, fall back to manual check
      if (error.code === 'PGRST202' || error.message?.includes('function can_create_project')) {
        console.log('Database function not found, using fallback project limit check');
        const projectLimits = await getProjectLimits(userId);
        return projectLimits?.canCreate ?? true;
      }
      
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in canCreateProject:', error);
    // Fallback to manual check
    const projectLimits = await getProjectLimits(userId);
    return projectLimits?.canCreate ?? true;
  }
}

/**
 * Get user's current project count and limit
 */
export async function getProjectLimits(userId: string): Promise<{
  currentCount: number;
  limit: number;
  canCreate: boolean;
} | null> {
  try {
    const supabase = createSupabaseServer();
    
    // Get user's plan
    const plan = await getUserPlan(userId);
    const projectLimit = plan === 'FREE' ? 3 : -1; // -1 means unlimited
    
    // Get current project count
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching project count:', error);
      
      // If projects table doesn't exist, return default values
      if (error.code === 'PGRST116' || error.message?.includes('relation "projects" does not exist')) {
        console.log('Projects table not found, returning default project limits');
        return {
          currentCount: 0,
          limit: projectLimit,
          canCreate: true
        };
      }
      
      return null;
    }

    const currentCount = projects?.length || 0;
    const canCreate = projectLimit === -1 || currentCount < projectLimit;

    return {
      currentCount,
      limit: projectLimit,
      canCreate
    };
  } catch (error) {
    console.error('Error in getProjectLimits:', error);
    return null;
  }
}

/**
 * Get credit usage statistics
 */
export async function getCreditUsageStats(userId: string) {
  try {
    const supabase = createSupabaseServer();
    
    // Get current credits
    const credits = await getUserCredits(userId);
    if (!credits) return null;

    // Get usage history for current billing period
    const { data: usageData, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', credits.billing_period_start)
      .lte('created_at', credits.billing_period_end)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching usage stats:', error);
      
      // If usage table doesn't exist, return basic stats without usage history
      if (error.code === 'PGRST116' || error.message?.includes('relation "usage" does not exist')) {
        console.log('Usage table not found, returning basic credit stats');
        const messageCreditsRemaining = credits.message_credits - credits.message_credits_used;
        const integrationCreditsRemaining = credits.integration_credits - credits.integration_credits_used;

        return {
          credits,
          usage: [],
          messageCreditsRemaining,
          integrationCreditsRemaining,
          messageCreditsPercentUsed: (credits.message_credits_used / credits.message_credits) * 100,
          integrationCreditsPercentUsed: (credits.integration_credits_used / credits.integration_credits) * 100
        };
      }
      
      return null;
    }

    const messageCreditsRemaining = credits.message_credits - credits.message_credits_used;
    const integrationCreditsRemaining = credits.integration_credits - credits.integration_credits_used;

    return {
      credits,
      usage: usageData || [],
      messageCreditsRemaining,
      integrationCreditsRemaining,
      messageCreditsPercentUsed: (credits.message_credits_used / credits.message_credits) * 100,
      integrationCreditsPercentUsed: (credits.integration_credits_used / credits.integration_credits) * 100
    };
  } catch (error) {
    console.error('Error in getCreditUsageStats:', error);
    return null;
  }
}
