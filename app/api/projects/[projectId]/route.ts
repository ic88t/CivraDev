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

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);

    if (!user) {
      user = await getCurrentUser();
    }

    if (!user?.email) {
      console.log('[Project API] No authenticated user found');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Fetching project: ${projectId} for user: ${user.id}`);

    const supabase = createSupabaseServer();

    // Get project from database
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      console.error('[API] Error fetching project:', error);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check Daytona status if project has a sandboxId
    let status = project.status;
    let previewUrl = project.preview_url;

    if (project.sandbox_id && process.env.DAYTONA_API_KEY) {
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
            console.log(`[API] Could not get preview URL:`, error);
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
        console.log(`[API] Could not sync project with Daytona:`, error);
        status = 'ERROR';
      }
    }

    return new Response(
      JSON.stringify({
        id: project.id,
        sandboxId: project.sandbox_id,
        name: project.name,
        description: project.description,
        prompt: project.prompt,
        status: status?.toLowerCase(),
        visibility: project.visibility?.toLowerCase(),
        createdAt: project.created_at,
        previewUrl: previewUrl,
        owner: { name: 'You' },
        workspace: null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[API] Error fetching project:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to fetch project"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
