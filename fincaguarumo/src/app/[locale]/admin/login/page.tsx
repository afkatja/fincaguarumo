"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../../../../components/ui/button"
import Input from "../../../../components/Input"
import { getBrowserClient } from "../../../../lib/supabaseClient"
import { validateRedirectTo, getSiteOrigin } from "../../../../lib/utils"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = validateRedirectTo(
    searchParams.get("redirectTo"),
    "/admin",
  )
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
        const emailDomain = normalizedEmail.split("@")[1] ?? "unknown"

        console.debug("[auth:signup] → signUp attempt", {
          emailDomain,
          emailRedirectTo,
          confirmPath,
          siteOrigin,
          hasNEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
          windowOrigin:
            typeof window !== "undefined" ? window.location.origin : null,
        })

        console.debug("[auth:signup] → diag-signup pre-check", { emailDomain })
        let diag: any = null
        try {
          const diagRes = await fetch("/api/auth/diag-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail }),
          })
          diag = diagRes.ok ? await diagRes.json() : null
          console.debug("[auth:signup] ← diag-signup pre-check response", {
            ok: diag?.ok ?? null,
            code: diag?.code ?? null,
            exists: diag?.exists ?? null,
            emailConfirmed: diag?.emailConfirmed ?? null,
            createdAt: diag?.created_at ?? null,
            emailConfirmedAt: diag?.email_confirmed_at ?? null,
          })
        } catch (diagErr) {
          console.warn("[auth:signup] diag-signup pre-check failed", diagErr)
        }

        if (diag?.exists) {
          if (diag.emailConfirmed) {
            console.info(
              "[auth:signup] blocking signup: email already confirmed",
              {
                emailDomain,
                createdAt: diag.created_at,
                lastSignInAt: diag.last_sign_in_at,
              },
            )
            setError(
              "An account with this email already exists. Please sign in instead.",
            )
            return
          }
          console.info(
            "[auth:signup] email already registered but unconfirmed — proceeding with signUp to resend confirmation",
            { emailDomain, createdAt: diag.created_at },
          )
        }

        console.debug("[auth:signup] → diag-link pre-flight", {
          emailDomain,
          emailRedirectTo,
        })
        let linkDiag: any = null
        try {
          const linkDiagRes = await fetch("/api/auth/diag-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              emailRedirectTo,
            }),
          })
          if (linkDiagRes.ok) {
            linkDiag = await linkDiagRes.json()
            console.debug("[auth:signup] ← diag-link pre-flight response", {
              ok: linkDiag?.ok,
              requestedOrigin: linkDiag?.requestedOrigin,
              generatedOrigin: linkDiag?.generatedOrigin,
              originRewritten: linkDiag?.originRewritten,
              mismatchAdvice: linkDiag?.mismatchAdvice,
              generatedActionLinkPreview: linkDiag?.generatedActionLink
                ? linkDiag.generatedActionLink.split("?")[0] + "?..."
                : null,
            })
          }
        } catch (linkErr) {
          console.warn("[auth:signup] diag-link pre-flight failed", linkErr)
        }

        if (linkDiag?.originRewritten) {
          console.error(
            "[auth:signup] SUPABASE WILL REWRITE THE REDIRECT ORIGIN — check your Supabase Redirect URLs allowlist",
            {
              requestedOrigin: linkDiag.requestedOrigin,
              generatedOrigin: linkDiag.generatedOrigin,
              advice: linkDiag.mismatchAdvice,
            },
          )
          setError(
            `Sign-up configuration issue: Supabase is sending the confirmation email with a redirect to ${linkDiag.generatedOrigin} instead of ${linkDiag.requestedOrigin}. An admin must add "${linkDiag.requestedOrigin}/*" to Authentication → URL Configuration → Redirect URLs in the Supabase dashboard. After confirming your email you will still be taken to ${linkDiag.generatedOrigin}.`,
          )
          // Don't return here — still proceed with the signUp so the user gets an
          // email. But the big red error explains the redirect misconfiguration.
        }

        const { data, error: signUpError } = await fetch(
          "/api/auth/admin-create-user",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
              emailRedirectTo,
              data: {
                locale: searchParams.get("locale") || "en",
                emailRedirectTo,
              },
            }),
          },
        ).then(res => res.json())

        console.debug("[auth:signup] ← admin-create-user response", {
          error: signUpError
            ? {
                name: signUpError.name,
                code: signUpError.code,
                status: signUpError.status,
                message: signUpError.message,
              }
            : null,
          userId: data.user?.id ?? null,
          message: data.message ?? null,
        })

        if (signUpError) {
          throw new Error(signUpError.message || "Sign up failed")
        }

        if (!data.user) {
          setError(
            "Sign up did not return a user. Please try again in a moment.",
          )
          return
        }

        console.info("[auth:signup] new signup pending email confirmation", {
          userId: data.user.id,
          emailDomain,
          emailRedirectTo,
          supabaseRewroteOrigin: linkDiag?.originRewritten ?? null,
        })
        setError(
          "Sign up successful! Please check your email to confirm your account.",
        )
        return
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

        if (data.user) {
          // Check if user is admin
          const {
            data: { session },
          } = await supabase.auth.getSession()
          const response = await fetch("/api/auth/check-admin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            credentials: "include",
          })

          const adminData = await response.json()

          if (adminData.isAdmin) {
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
