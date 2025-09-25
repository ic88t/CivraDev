import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Create server-side Supabase client with service role key
function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get() {
          return undefined
        },
        set() {
          // No-op for server admin client
        },
        remove() {
          // No-op for server admin client
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/'

  console.log('[API Auth] Callback request details:', {
    url: request.url,
    code: code ? 'Present' : 'Missing',
    error,
    errorDescription,
    allParams: Object.fromEntries(searchParams.entries()),
    origin: request.nextUrl.origin
  })

  // Handle OAuth errors
  if (error) {
    console.error('[API Auth] OAuth error:', { error, errorDescription })
    return Response.redirect(`${request.nextUrl.origin}/auth/signin?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const cookieStore = cookies()

    // Create regular Supabase client for user session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    console.log('[API Auth] Processing auth callback with code')

    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[API Auth] Code exchange error:', error)
        return Response.redirect(`${request.nextUrl.origin}/auth/signin?error=${encodeURIComponent(error.message)}`)
      }

      if (data.user && data.session) {
        console.log('[API Auth] User authenticated:', {
          id: data.user.id,
          email: data.user.email,
          provider: data.user.app_metadata.provider
        })

        // Ensure user profile exists (backup to database trigger)
        try {
          await ensureUserProfile(data.user)
        } catch (profileError) {
          console.error('[API Auth] Profile creation error (non-fatal):', profileError)
          // Don't fail auth if profile creation fails
        }

        // Successful authentication
        return Response.redirect(`${request.nextUrl.origin}${next}`)
      }
    } catch (error) {
      console.error('[API Auth] Unexpected error:', error)
      return Response.redirect(`${request.nextUrl.origin}/auth/signin?error=${encodeURIComponent('Authentication failed')}`)
    }
  }

  // No code provided or other issues
  return Response.redirect(`${request.nextUrl.origin}/auth/signin?error=no_code`)
}

// Backup function to ensure user profile exists
async function ensureUserProfile(user: any) {
  const supabaseAdmin = createSupabaseAdmin()

  console.log('[API Auth] Checking if user profile exists:', user.id)

  // Check if profile already exists
  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    console.log('[API Auth] User profile already exists')
    return existingProfile
  }

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = "The result contains 0 rows" - expected when profile doesn't exist
    console.error('[API Auth] Error checking existing profile:', fetchError)
    throw fetchError
  }

  console.log('[API Auth] Creating user profile...')

  // Extract user info from various OAuth providers
  const userName = user.user_metadata?.full_name ||
                   user.user_metadata?.name ||
                   user.user_metadata?.user_name ||
                   user.email?.split('@')[0] ||
                   'User'

  const userImage = user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture ||
                    null

  // Create profile
  const { data: newProfile, error: createError } = await supabaseAdmin
    .from('profiles')
    .insert([
      {
        id: user.id,
        name: userName,
        image: userImage,
      }
    ])
    .select()
    .single()

  if (createError) {
    console.error('[API Auth] Error creating user profile:', createError)
    throw createError
  }

  console.log('[API Auth] User profile created successfully:', newProfile.id)
  return newProfile
}