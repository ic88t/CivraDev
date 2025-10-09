import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth-utils";
import { canCreateProject } from "@/lib/credits";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Function to generate a clean project summary from the prompt
async function generateProjectSummary(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Generate a clean, professional 2-3 word project title for this request: "${prompt}". Examples: "Portfolio Tracker", "NFT Marketplace", "DeFi Platform", "Crypto Wallet". Just return the title, nothing else.`
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.content[0].text.trim();

    // Clean up the response and ensure it's a reasonable length
    const cleanSummary = summary.replace(/["']/g, '').trim();
    return cleanSummary.length > 30 ? cleanSummary.substring(0, 30) : cleanSummary;
  } catch (error) {
    console.error('Error generating project summary:', error);
    // Fallback to simple keyword extraction
    const prompt_lower = prompt.toLowerCase();
    if (prompt_lower.includes('portfolio')) return 'Portfolio Tracker';
    if (prompt_lower.includes('nft') || prompt_lower.includes('marketplace')) return 'NFT Marketplace';
    if (prompt_lower.includes('defi') || prompt_lower.includes('staking')) return 'DeFi Platform';
    if (prompt_lower.includes('dao') || prompt_lower.includes('governance')) return 'DAO Platform';
    if (prompt_lower.includes('token') || prompt_lower.includes('erc20')) return 'Token Manager';
    if (prompt_lower.includes('wallet')) return 'Crypto Wallet';
    if (prompt_lower.includes('game') || prompt_lower.includes('gaming')) return 'Web3 Game';
    if (prompt_lower.includes('exchange') || prompt_lower.includes('swap')) return 'DEX Platform';
    return 'Web3 Application';
  }
}

// Create server-side Supabase client
function createSupabaseServer() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      console.log('[Create Project API] No authenticated user found');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Creating project for user: ${user.email}`);

    // Check if user can create more projects
    const canCreate = await canCreateProject(user.id);
    if (!canCreate) {
      return new Response(
        JSON.stringify({
          error: "You've reached the maximum number of projects (3) for the free plan. Please upgrade to create more projects.",
          needsUpgrade: true,
          limitType: 'projects'
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createSupabaseServer();

    // Generate AI-powered project summary
    console.log('[API] Generating project summary...');
    const projectName = await generateProjectSummary(prompt);
    console.log(`[API] Generated project name: ${projectName}`);

    // Create project record in database
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
        description: projectName,
        prompt: prompt,
        status: 'CREATING',
        visibility: 'PRIVATE',
      })
      .select()
      .single();

    if (error || !project) {
      console.error('[API] Error creating project:', error);
      return new Response(
        JSON.stringify({ error: "Failed to create project" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Created project: ${project.id} - ${projectName}`);

    // Return projectId immediately so the UI can redirect
    return new Response(
      JSON.stringify({
        projectId: project.id,
        name: projectName
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[API] Error creating project:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create project"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
