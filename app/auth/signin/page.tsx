"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase-client"

function SignInPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log("[SignIn] Session check:", {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: sessionError
        })

        // Check localStorage for debugging
        const lastAuth = localStorage.getItem('civra_last_auth')
        if (lastAuth) {
          console.log("[SignIn] Last successful auth:", JSON.parse(lastAuth))
        }

        if (session) {
          console.log("[SignIn] Already logged in, redirecting to:", callbackUrl)
          router.push(callbackUrl)
          return
        }
      } catch (error) {
        console.error("[SignIn] Error checking session:", error)
      }
      setIsChecking(false)
    }
    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[SignIn] Auth state change:", event, {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      })

      if (event === 'SIGNED_IN' && session) {
        console.log("[SignIn] Signed in via auth state change, redirecting")
        router.push(callbackUrl)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, callbackUrl])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      console.log('[SignIn] Attempting Google sign in...')
      console.log('[SignIn] Current origin:', window.location.origin)
      console.log('[SignIn] Callback URL param:', callbackUrl)

      // Clear any previous auth attempts
      localStorage.removeItem('supabase.auth.token')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent', // Force account selection
          }
        }
      })

      console.log('[SignIn] Google OAuth initiation:', { data, error })

      if (error) {
        console.error('[SignIn] Google sign in error:', error)
        setIsLoading(false)
        // Don't show alert immediately, the error might be in the callback
      } else {
        console.log('[SignIn] Redirecting to Google OAuth...')
        // Loading state will persist until page redirect
      }
    } catch (error) {
      console.error('[SignIn] Google sign in exception:', error)
      alert(`Sign in failed: ${error}`)
      setIsLoading(false)
    }
  }

  const handleGitHubSignIn = async () => {
    setIsLoading(true)
    try {
      console.log('Attempting GitHub sign in...')
      console.log('Current origin:', window.location.origin)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      })

      console.log('GitHub sign in response:', { data, error })

      if (error) {
        console.error('GitHub sign in error:', error)
        alert(`Sign in failed: ${error.message}`)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('GitHub sign in exception:', error)
      alert(`Sign in failed: ${error}`)
      setIsLoading(false)
    }
  }


  // Show loading while checking if user is already signed in
  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to Civra
          </h1>
          <p className="text-gray-400">
            Sign in to start building Web3 applications
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              {error === 'no_code' ? 'Authorization was cancelled or failed' :
               error === 'no_session' ? 'Failed to create session. Please try again.' :
               error === 'Authentication failed' ? 'Authentication failed. Please try again.' :
               decodeURIComponent(error)}
            </p>
          </div>
        )}

        {/* Sign-in options */}
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <button
              onClick={handleGitHubSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
              )}
              Continue with GitHub
            </button>
          </div>

        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            ← Back to Civra
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div></div>}>
      <SignInPageContent />
    </Suspense>
  )
}