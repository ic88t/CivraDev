"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('[AuthCallback] Processing OAuth callback...')
        console.log('[AuthCallback] Current URL:', window.location.href)
        console.log('[AuthCallback] Search params:', Object.fromEntries(searchParams.entries()))

        // Get the code and state from URL parameters
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error('[AuthCallback] OAuth error:', error, errorDescription)
          router.push(`/auth/signin?error=${encodeURIComponent(errorDescription || error)}`)
          return
        }

        if (!code) {
          console.error('[AuthCallback] No authorization code found')
          router.push('/auth/signin?error=no_code')
          return
        }

        console.log('[AuthCallback] Exchanging code for session...')

        // Exchange the code for a session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        console.log('[AuthCallback] Code exchange result:', {
          hasSession: !!data.session,
          hasUser: !!data.user,
          error: exchangeError
        })

        if (exchangeError) {
          console.error('[AuthCallback] Code exchange error:', exchangeError)
          router.push(`/auth/signin?error=${encodeURIComponent(exchangeError.message)}`)
          return
        }

        if (data.session && data.user) {
          console.log('[AuthCallback] Authentication successful!')
          console.log('[AuthCallback] User:', {
            id: data.user.id,
            email: data.user.email,
            provider: data.user.app_metadata.provider
          })

          // Store session info for debugging
          localStorage.setItem('civra_last_auth', JSON.stringify({
            timestamp: new Date().toISOString(),
            userId: data.user.id,
            email: data.user.email,
            provider: data.user.app_metadata.provider
          }))

          // Successful authentication - redirect to home
          router.push('/')
        } else {
          console.error('[AuthCallback] No session created')
          router.push('/auth/signin?error=no_session')
        }
      } catch (error) {
        console.error('[AuthCallback] Unexpected error:', error)
        router.push(`/auth/signin?error=${encodeURIComponent('Authentication failed')}`)
      } finally {
        setIsProcessing(false)
      }
    }

    // Only run the callback handler once when the component mounts
    if (isProcessing) {
      handleAuthCallback()
    }
  }, [router, searchParams, isProcessing])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">
          {isProcessing ? 'Completing authentication...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}