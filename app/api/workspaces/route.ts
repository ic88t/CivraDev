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

// GET /api/workspaces - List user's workspaces
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

    console.log(`[Workspaces API] Fetching workspaces for user: ${user.email}`);
    const supabase = createSupabaseServer();

    // Get workspaces where user is a member
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select(`
        *,
        workspace_members!inner(
          id,
          role,
          joined_at,
          profiles(
            id,
            name,
            image
          )
        ),
        projects(
          id,
          name,
          status,
          created_at
        )
      `)
      .eq('workspace_members.user_id', user.id)
      .order('created_at', { ascending: false });

    if (workspacesError) {
      console.error('[Workspaces API] Error fetching workspaces:', workspacesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch workspaces" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format the response
    const formattedWorkspaces = (workspaces || []).map(workspace => {
      const members = workspace.workspace_members || [];
      const projects = workspace.projects || [];
      const userMember = members.find((member: any) => member.profiles?.id === user.id);
      
      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        createdAt: workspace.created_at,
        memberCount: members.length,
        projectCount: projects.length,
        recentProjects: projects.slice(0, 5).map((project: any) => ({ // Fixed TypeScript implicit any error
          id: project.id,
          name: project.name,
          status: project.status,
          createdAt: project.created_at,
        })),
        members: members.map((member: any) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joined_at,
          user: {
            id: member.profiles?.id,
            name: member.profiles?.name,
            email: member.profiles?.email || '',
            image: member.profiles?.image,
          },
        })),
        userRole: userMember?.role || 'VIEWER',
      };
    });

    return new Response(
      JSON.stringify({ workspaces: formattedWorkspaces }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Workspaces API] Error fetching workspaces:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch workspaces" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// POST /api/workspaces - Create new workspace
export async function POST(req: NextRequest) {
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

    const { name, description } = await req.json();
    const supabase = createSupabaseServer();

    if (!name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Workspace name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
        },
      ])
      .select()
      .single();

    if (workspaceError || !workspace) {
      console.error('[Workspaces API] Error creating workspace:', workspaceError);
      return new Response(
        JSON.stringify({ error: "Failed to create workspace" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert([
        {
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'OWNER',
        },
      ]);

    if (memberError) {
      console.error('[Workspaces API] Error adding owner:', memberError);
      // Try to clean up the workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return new Response(
        JSON.stringify({ error: "Failed to create workspace" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          createdAt: workspace.created_at,
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
        },
      }),
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