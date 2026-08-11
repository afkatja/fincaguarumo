import { useState, useEffect } from "react"
import { getBrowserClient } from "../lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getBrowserClient()

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }: { data: { session: Session | null } }) => {
        setSession(session)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setSession(session)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  const getAccessToken = async () => {
    if (!session) return null

    const supabase = getBrowserClient()
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession()

    if (error || !currentSession) {
      return null
    }

    return currentSession.access_token
  }

  return {
    session,
    loading,
    user: session?.user || null,
    getAccessToken,
  }
}
