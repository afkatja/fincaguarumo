import { useState, useEffect, useMemo } from "react"
import { getBrowserClient } from "../lib/supabaseClient"
import type { Session } from "@supabase/supabase-js"

function getIsAdminFromUser(user: Session["user"] | null | undefined): boolean {
  if (!user) return false
  const appMetadata = user.app_metadata
  if (appMetadata && typeof appMetadata === "object") {
    return appMetadata.role === "admin"
  }
  return false
}

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tokenLoading, setTokenLoading] = useState(false)

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

  const isAdmin = useMemo(() => getIsAdminFromUser(session?.user), [session?.user])

  const getAccessToken: () => Promise<string | null> = async () => {
    if (!session) return null

    setTokenLoading(true)
    try {
      const supabase = getBrowserClient()

      // First, try to get the current session
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession()

      // If session exists and is valid, return the access token
      if (currentSession && !sessionError) {
        return currentSession.access_token
      }

      // If session is expired or invalid, attempt to refresh
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession()

      if (refreshError || !refreshedSession) {
        // Session refresh failed - user needs to re-authenticate
        return null
      }

      // Update the local session state with the refreshed session
      setSession(refreshedSession)
      return refreshedSession.access_token
    } catch (err) {
      console.error("Error fetching access token:", err)
      return null
    } finally {
      setTokenLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = getBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    return { data, error }
  }

  const signOut = async () => {
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  return {
    session,
    loading,
    tokenLoading,
    user: session?.user || null,
    isAdmin,
    getAccessToken,
    signInWithEmail,
    signOut,
  }
}
