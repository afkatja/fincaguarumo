"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../../../../components/ui/button"
import Input from "../../../../components/Input"
import { useSupabaseAuth } from "../../../../hooks/useSupabaseAuth"
import { validateRedirectTo, getSiteOrigin } from "../../../../lib/utils"

export default function AdminLoginPage() {
  const searchParams = useSearchParams()
  const redirectTo = validateRedirectTo(
    searchParams.get("redirectTo"),
    "/admin",
  )
  const { signInWithEmail, signOut } = useSupabaseAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const siteOrigin = getSiteOrigin()
        const localePath = window.location.pathname
        const confirmPath = localePath.replace(
          /\/admin\/login\/?$/,
          "/admin/auth/confirm",
        )
        const redirectParams = new URLSearchParams()
        redirectParams.set("redirectTo", redirectTo)
        const emailRedirectTo = `${siteOrigin}${confirmPath}?${redirectParams.toString()}`

        const normalizedEmail = email.trim().toLowerCase()

        const response = await fetch("/api/auth/admin-create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
            emailRedirectTo,
            data: {
              locale: searchParams.get("locale") || "en",
            },
          }),
        })

        const responseData = await response.json()

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 409) {
            setError(
              "An account with this email already exists. Please sign in instead.",
            )
            return
          }
          throw new Error(responseData.error || "Sign up failed")
        }

        if (!responseData.user) {
          setError(
            "Sign up did not return a user. Please try again in a moment.",
          )
          return
        }

        setError(
          "Sign up successful! Please check your email to confirm your account.",
        )
        return
      } else {
        // Sign in
        const { data, error: signInError } = await signInWithEmail(
          email,
          password,
        )

        if (signInError) {
          throw signInError
        }

        if (data.user) {
          // Check if user is admin
          const response = await fetch("/api/auth/check-admin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session?.access_token}`,
            },
            credentials: "include",
          })

          const adminData = await response.json()

          if (adminData.isAdmin) {
            // Use window.location.href for full page reload to ensure auth state is established
            window.location.href = redirectTo
          } else {
            setError("Access denied. Admin privileges required.")
            await signOut()
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
