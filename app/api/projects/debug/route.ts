import { NextRequest } from "next/server";
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
  const { searchParams } = new URL(req.url);
  const sandboxId = searchParams.get('id');
  
  try {

    if (!sandboxId) {
      return new Response(
        JSON.stringify({ error: "Sandbox ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[DEBUG] Checking project info for sandbox: ${sandboxId}`);

    const supabase = createSupabaseServer();

    // Get project from database
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .select('*')
      .eq('sandbox_id', sandboxId)
      .single();

    console.log('[DEBUG] Database lookup result:', { project, dbError });

    const result: any = {
      sandboxId,
      databaseInfo: {
        found: !!project,
        error: dbError?.message || null,
        project: project ? {
          id: project.id,
          name: project.name,
          status: project.status,
          created_at: project.created_at,
          user_id: project.user_id
        } : null
      }
    };

    // Also try to check Daytona if API key is available
    if (process.env.DAYTONA_API_KEY) {
      try {
        const { Daytona } = await import('@daytonaio/sdk');
        const daytona = new Daytona({
          apiKey: process.env.DAYTONA_API_KEY,
        });

        const sandboxes = await daytona.list();
        const foundInDaytona = sandboxes.find((s: any) => s.id === sandboxId);

        result.daytonaInfo = {
          totalSandboxes: sandboxes.length,
          foundSandbox: !!foundInDaytona,
          availableIds: sandboxes.slice(0, 5).map((s: any) => s.id), // Show first 5 IDs
          sandbox: foundInDaytona ? {
            id: foundInDaytona.id,
            state: foundInDaytona.state,
            created: foundInDaytona.createdAt
          } : null
        };

        console.log('[DEBUG] Daytona lookup result:', result.daytonaInfo);

      } catch (daytonaError) {
        result.daytonaInfo = {
          error: daytonaError instanceof Error ? daytonaError.message : String(daytonaError),
          apiKeyPresent: !!process.env.DAYTONA_API_KEY
        };
        console.error('[DEBUG] Daytona API error:', daytonaError);
      }
    } else {
      result.daytonaInfo = {
        error: "DAYTONA_API_KEY not configured"
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[DEBUG] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Debug check failed",
        sandboxId
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}