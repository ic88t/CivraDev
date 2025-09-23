"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback page loaded')

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()

        console.log('Auth callback session:', { data, error })

        if (error) {
          console.error('Auth callback error:', error)
          router.push('/auth/signin?error=' + encodeURIComponent(error.message))
          return
        }

        if (data.session) {
          console.log('Authentication successful:', data.session.user)
          router.push('/')
        } else {
          console.log('No session found, redirecting to signin')
          router.push('/auth/signin')
        }
      } catch (error) {
        console.error('Auth callback exception:', error)
        router.push('/auth/signin')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Completing authentication...</p>
      </div>
    </div>
  )
}