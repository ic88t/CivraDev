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

// GET /api/workspaces-simple/[id] - Get workspace details with projects
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const workspaceId = params.id;
    
    // Only support "my-projects" workspace for now
    if (workspaceId !== 'my-projects') {
      return new Response(
        JSON.stringify({ error: "Workspace not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[Workspaces API] Fetching detailed projects for user: ${user.email}`);
    const supabase = createSupabaseServer();

    // Get user's projects with full details
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('[Workspaces API] Error fetching projects:', projectsError);
    }

    // Format projects for the workspace view
    const formattedProjects = (projects || []).map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      visibility: project.visibility || 'PRIVATE',
      sandboxId: project.sandbox_id,
      previewUrl: project.preview_url,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      user: {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        email: user.email,
      },
    }));

    // Create detailed workspace response
    const workspace = {
      id: 'my-projects',
      name: 'My Projects',
      description: `Your personal Web3 projects (${formattedProjects.length} total)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      memberCount: 1,
      projectCount: formattedProjects.length,
      userRole: 'OWNER',
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
      projects: formattedProjects,
    };

    return new Response(
      JSON.stringify({ workspace }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Workspaces API] Error fetching workspace:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch workspace" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
