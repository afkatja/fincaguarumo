"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { getBrowserClient } from "../../../../../lib/supabaseClient"
import { validateRedirectTo, getSiteOrigin } from "../../../../../lib/utils"
import Loading from "../../../loading"

/**
 * Admin signup confirmation landing page.
 *
 * Supabase confirmation emails (and magic-link style recovery emails)
 * redirect the user back here with access_token / refresh_token /
 * type=signup in the URL fragment. The Supabase browser client auto-senses
 * these tokens when `getSession()` runs and establishes a local session.
 *
 * The page then:
 *   1. waits for session to appear
 *   2. calls /api/auth/check-admin to verify the user is an admin
 *   3. redirects to the `redirectTo` query param (default /admin) if admin
 *   4. signs out and shows an error if not an admin
 *   5. handles the case where confirmation failed or tokens are missing
 *      (e.g. link expired) by guiding the user back to the login page
 *      with a resend hint
 */
export default function AdminAuthConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = validateRedirectTo(
    searchParams.get("redirectTo"),
    "/admin",
  )

  const [stage, setStage] = useState<
    "exchanging" | "checking-admin" | "needs-admin" | "success" | "error"
  >("exchanging")
  const [error, setError] = useState<string | null>(null)
  const [retryHref, setRetryHref] = useState<string | null>(null)

  const supabase = getBrowserClient()

  useEffect(() => {
    let disposed = false

    async function run() {
      const siteOrigin = getSiteOrigin()
      const loginHref = `${siteOrigin}${window.location.pathname.replace(
        /\/admin\/auth\/confirm\/?$/,
        "/admin/login",
      )}?redirectTo=${encodeURIComponent(redirectTo)}`
      setRetryHref(loginHref)

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (disposed) return

        if (!session) {
          setStage("error")
          setError(
            "We couldn't find a valid confirmation token in the link. The link may have expired, or you may have opened it on a different device. Please sign in or request a new confirmation by trying to sign up again with the same email.",
          )
          return
        }

        setStage("checking-admin")

        const adminRes = await fetch("/api/auth/check-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          credentials: "include",
        })

        const adminData = await adminRes.json().catch(() => ({}))

        if (disposed) return

        if (adminData.isAdmin) {
          setStage("success")
          window.location.href = redirectTo
          return
        }

        setStage("needs-admin")
        setError(
          "Your email has been confirmed, but this account does not have admin privileges yet. Ask an existing admin to promote your account using the make-admin script, then sign in normally.",
        )
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore signOut errors; we're showing the error state anyway
        }
      } catch (err) {
        if (disposed) return
        setStage("error")
        setError(
          err instanceof Error
            ? `Something went wrong while confirming your email: ${err.message}`
            : "Something went wrong while confirming your email. Please try signing in again.",
        )
      }
    }

    run()

    return () => {
      disposed = true
    }
    // We only want to run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-slate-950">
            {stage === "exchanging"
              ? "Confirming your email…"
              : stage === "checking-admin"
                ? "Verifying admin access…"
                : stage === "success"
                  ? "Email confirmed"
                  : stage === "needs-admin"
                    ? "Email confirmed"
                    : "Couldn't confirm your email"}
          </h2>
          <p className="mt-2 text-center text-slate-600">
            {stage === "exchanging"
              ? "Hang tight while we verify the link from your email."
              : stage === "checking-admin"
                ? "Checking your admin permissions."
                : stage === "success"
                  ? "Redirecting you to your destination…"
                  : stage === "needs-admin"
                    ? "Your account needs admin access to proceed."
                    : "The link may have expired or may already be used."}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {(stage === "exchanging" || stage === "checking-admin") && (
            <div
              role="status"
              className="flex items-center justify-center p-6 text-slate-500"
            >
              <Loading />
              <span className="sr-only">Loading…</span>
            </div>
          )}

          {stage === "success" && !error && (
            <div
              className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700"
              role="status"
            >
              All set — you should be redirected momentarily. If nothing
              happens,{" "}
              <a className="underline font-medium" href={redirectTo}>
                continue to your destination
              </a>
              .
            </div>
          )}

          {(stage === "error" || stage === "needs-admin") && error && (
            <div
              className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {(stage === "error" || stage === "needs-admin") && retryHref && (
            <Button
              type="button"
              variant="default"
              onClick={() => {
                window.location.href = retryHref
              }}
              className="w-full"
            >
              Back to admin sign in
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
