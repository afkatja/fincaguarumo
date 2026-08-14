"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../../../../components/ui/button"
import Input from "../../../../components/Input"
import { getBrowserClient } from "../../../../lib/supabaseClient"
import { validateRedirectTo } from "../../../../lib/utils"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = validateRedirectTo(searchParams.get("redirectTo"), "/admin")
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = getBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          throw signUpError
        }

        if (data.user) {
          setError(
            "Sign up successful! Please check your email to confirm your account.",
          )
          return
        }
      } else {
        // Sign in
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (signInError) {
          throw signInError
        }

        console.log("Sign in successful, user:", data.user)

        if (data.user) {
          // Check if user is admin
          const response = await fetch("/api/auth/check-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: data.user.id }),
            credentials: "include",
          })

          const adminData = await response.json()

          console.log("Admin check response:", adminData)
          console.log("Redirecting to:", redirectTo)

          if (adminData.isAdmin) {
            console.log("User is admin, attempting redirect...")
            // Use window.location.href for full page reload to ensure auth state is established
            window.location.href = redirectTo
          } else {
            setError("Access denied. Admin privileges required.")
            await supabase.auth.signOut()
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-slate-950">
            Admin {isSignUp ? "Sign Up" : "Sign In"}
          </h2>
          <p className="mt-2 text-center text-slate-600">
            {isSignUp
              ? "Create an admin account"
              : "Enter your credentials to access the admin dashboard"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}
            <Input
              id="email"
              type="email"
              required
              labelText="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              placeholder="admin@fincaguarumo.com"
              autoComplete="email"
              errorMessage=""
              className="text-zinc-900"
            />
            <Input
              id="password"
              type="password"
              required
              labelText="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              errorMessage=""
              className="text-zinc-900"
            />
            <Button
              type="submit"
              variant="default"
              disabled={loading}
              className="w-full"
            >
              {loading
                ? "Processing..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>
        </div>
        <div className="text-center">
          <Button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-slate-600 hover:text-slate-950 underline"
            disabled={loading}
            variant="link"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Need an account? Sign up"}
          </Button>
        </div>
      </div>
    </div>
  )
}
