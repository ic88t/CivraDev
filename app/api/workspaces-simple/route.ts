import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth-utils";
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

// Workspace API that shows user's projects as a "My Projects" workspace
export async function GET(req: NextRequest) {
  try {
    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      console.log('[Workspaces API] No authenticated user found');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Workspaces API] Fetching projects for user: ${user.email}`);
    const supabase = createSupabaseServer();

    // Get user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('[Workspaces API] Error fetching projects:', projectsError);
      // Return empty workspace instead of failing
    }

    // Create a "My Projects" workspace with user's projects
    const myProjectsWorkspace = {
      id: 'my-projects',
      name: 'My Projects',
      description: `Your personal Web3 projects (${projects?.length || 0} total)`,
      createdAt: new Date().toISOString(),
      memberCount: 1,
      projectCount: projects?.length || 0,
      recentProjects: (projects || []).slice(0, 5).map(project => ({
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.created_at,
      })),
      members: [
        {
          id: user.id,
          role: 'OWNER',
          joinedAt: new Date().toISOString(),
          user: {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            email: user.email,
            image: user.user_metadata?.avatar_url,
          },
        },
      ],
      userRole: 'OWNER',
    };

    return new Response(
      JSON.stringify({ workspaces: [myProjectsWorkspace] }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Workspaces API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch workspaces" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Simple POST that creates a basic workspace
export async function POST(req: NextRequest) {
  try {
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { name, description } = await req.json();

    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Workspace name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return a mock workspace for now
    const mockWorkspace = {
      id: `ws_${Date.now()}`,
      name: name.trim(),
      description: description?.trim() || null,
      createdAt: new Date().toISOString(),
      memberCount: 1,
      projectCount: 0,
      members: [
        {
          id: user.id,
          role: 'OWNER',
          joinedAt: new Date().toISOString(),
          user: {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            email: user.email,
            image: user.user_metadata?.avatar_url,
          },
        },
      ],
      userRole: "OWNER",
    };

    return new Response(
      JSON.stringify({ workspace: mockWorkspace }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Workspaces API] Error creating workspace:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create workspace" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
