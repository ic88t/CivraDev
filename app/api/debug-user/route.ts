import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth-utils";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
    console.log('\n=== USER DEBUG SESSION ===');

    // Try to get user from request first, then fallback to cookies
    let user = await getCurrentUserFromRequest(req);
    if (!user) {
      user = await getCurrentUser();
    }

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "No authenticated user found",
          session: null,
          cookies: Array.from(cookies().getAll()).map(c => c.name)
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createSupabaseServer();

    // Get session details
    const { data: session } = await supabase.auth.getSession();

    // Get user details from auth.users table
    const { data: authUser, error: authError } = await supabase.auth.getUser();

    // Get all projects for this user
    const { data: userProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, user_id, created_at')
      .eq('user_id', user.id);

    // Get ALL projects to see if there's data leakage
    const { data: allProjects, error: allError } = await supabase
      .from('projects')
      .select('id, name, user_id, created_at');

    console.log('Current user ID:', user.id);
    console.log('Current user email:', user.email);
    console.log('User projects count:', userProjects?.length || 0);
    console.log('Total projects in DB:', allProjects?.length || 0);

    const debugInfo = {
      currentUser: {
        id: user.id,
        email: user.email,
        provider: authUser?.user?.app_metadata?.provider,
        providers: authUser?.user?.app_metadata?.providers || [],
        lastSignIn: authUser?.user?.last_sign_in_at,
        createdAt: authUser?.user?.created_at
      },
      session: {
        accessToken: session?.session?.access_token ? 'present' : 'missing',
        refreshToken: session?.session?.refresh_token ? 'present' : 'missing',
        expiresAt: session?.session?.expires_at,
        provider: session?.session?.provider_token ? 'present' : 'missing'
      },
      projects: {
        userProjectsCount: userProjects?.length || 0,
        totalProjectsCount: allProjects?.length || 0,
        userProjects: userProjects?.map(p => ({
          id: p.id,
          name: p.name,
          user_id: p.user_id,
          isCurrentUser: p.user_id === user.id,
          created_at: p.created_at
        })) || [],
        otherUsersProjects: allProjects?.filter(p => p.user_id !== user.id).map(p => ({
          id: p.id,
          name: p.name,
          user_id: p.user_id,
          created_at: p.created_at
        })) || []
      },
      cookies: Array.from(cookies().getAll()).filter(c =>
        c.name.includes('supabase') || c.name.includes('auth')
      ).map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0
      })),
      errors: {
        authError: authError?.message || null,
        projectsError: projectsError?.message || null,
        allError: allError?.message || null
      }
    };

    console.log('Debug info compiled:', JSON.stringify(debugInfo, null, 2));

    return new Response(
      JSON.stringify(debugInfo, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("[DEBUG USER] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Debug failed",
        stack: error.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}