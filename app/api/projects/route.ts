import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth-utils";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function GET(req: NextRequest) {
  try {
    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      console.log('[Projects API] No authenticated user found');
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          projects: []
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "DAYTONA_API_KEY not configured",
          projects: []
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Fetching projects for user: ${user.id}`);

    const supabase = createSupabaseServer();

    // Get projects from database first (user-owned only for now)
    const { data: dbProjects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching projects:', error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch projects",
          projects: []
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // If we have database projects with sandboxIds, sync their status with Daytona
    const projects = await Promise.all(
      (dbProjects || []).map(async (project) => {
        let status = project.status;
        let previewUrl = project.preview_url;

        // If project has a sandboxId, check its status in Daytona
        if (project.sandbox_id) {
          try {
            const { Daytona } = await import('@daytonaio/sdk');
            const daytona = new Daytona({
              apiKey: process.env.DAYTONA_API_KEY!,
            });

            const sandbox = await daytona.get(project.sandbox_id);       
            status = (sandbox as any).state === 'running' ? 'ACTIVE' :
                    (sandbox as any).state === 'stopped' ? 'STOPPED' :
                    'ERROR';

            // Try to get preview URL if sandbox is running
            if ((sandbox as any).state === 'running') {
              try {
                const preview = await sandbox.getPreviewLink(3000);
                previewUrl = preview?.url || null;
              } catch (error) {
                console.log(`[API] Could not get preview URL for ${project.sandbox_id}:`, error);
              }
            }

            // Update project status in database if changed
            if (status !== project.status || previewUrl !== project.preview_url) {
              await supabase
                .from('projects')
                .update({
                  status: status as any,
                  preview_url: previewUrl,
                })
                .eq('id', project.id);
            }
          } catch (error) {
            console.log(`[API] Could not sync project ${project.id} with Daytona:`, error);
            status = 'ERROR';
          }
        }

        return {
          id: project.id,
          sandboxId: project.sandbox_id,
          name: project.name,
          description: project.description,
          prompt: project.prompt,
          status: status?.toLowerCase(),
          visibility: project.visibility?.toLowerCase(),
          createdAt: project.created_at,
          previewUrl: previewUrl,
          owner: { name: 'You' }, // Since we know it's the current user
          workspace: null, // No workspace support yet
        };
      })
    );

    return new Response(
      JSON.stringify({
        projects: projects,
        total: projects.length
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[API] Error fetching projects:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to fetch projects",
        projects: []
      }),
      {
        status: error.message === "Authentication required" ? 401 : 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sandboxId = searchParams.get('id');

    if (!sandboxId) {
      return new Response(
        JSON.stringify({ error: "Sandbox ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.DAYTONA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DAYTONA_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Deleting sandbox: ${sandboxId}`);

    // Dynamic import to avoid ESM issues during build
    const { Daytona } = await import('@daytonaio/sdk');
    
    const daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
    });

    // Delete the sandbox - need to get sandbox object first since delete() expects Sandbox, not string
    try {
      const sandbox = await daytona.get(sandboxId);
      await daytona.delete(sandbox);
    } catch (error) {
      console.log('Sandbox may already be deleted or not found:', error);
      // Continue anyway since the project will be deleted from database
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("[API] Error deleting project:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete project" }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}
