import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from "next/server"

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
        set(name: string, value: string, options: any) {
          // Server-side doesn't need to set cookies
        },
        remove(name: string, options: any) {
          // Server-side doesn't need to remove cookies
        },
      },
    }
  )
}

// Alternative approach: get user from Authorization header
export async function getCurrentUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]

  // Create a simple Supabase client with anon key for token validation
  const { createClient } = require('@supabase/supabase-js')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.log('Token validation error:', error)
      return null
    }

    return user
  } catch (error) {
    console.log('Token validation exception:', error)
    return null
  }
}

export async function getCurrentUser() {
  const supabase = createSupabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    console.log('No user found on server:', error)
    return null
  }

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user || !user.email) {
    throw new Error("Authentication required")
  }

  return user
}

export async function getOrCreateUser(user: any) {
  const supabase = createSupabaseServer()

  // Check if profile exists
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile && !fetchError) {
    return profile
  }

  // Create profile if it doesn't exist
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert([
      {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
        image: user.user_metadata?.avatar_url,
      }
    ])
    .select()
    .single()

  if (createError) {
    console.error('Error creating user profile:', createError)
    throw new Error('Failed to create user profile')
  }

  return newProfile
}

export async function canAccessProject(userId: string, projectId: string) {
  const supabase = createSupabaseServer()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      workspaces (
        *,
        workspace_members!inner (
          user_id,
          role
        )
      )
    `)
    .eq('id', projectId)
    .or(`user_id.eq.${userId},workspaces.workspace_members.user_id.eq.${userId}`)
    .single()

  if (error) {
    return null
  }

  return project
}

export async function trackUsage(userId: string, type: string, amount: number = 1, details?: any) {
  const supabase = createSupabaseServer()

  const { error } = await supabase
    .from('usage')
    .insert([
      {
        user_id: userId,
        type,
        amount,
        details: details || null,
      }
    ])

  if (error) {
    console.error('Error tracking usage:', error)
  }
}