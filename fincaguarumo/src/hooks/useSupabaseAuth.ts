import { createClient } from "@supabase/supabase-js"
import { useState, useEffect } from "react"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function useSupabaseAuth() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const getAccessToken = async () => {
    if (!session) return null
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()
    
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
