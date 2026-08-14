"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { getBrowserClient } from "../../../../../lib/supabaseClient"
import { validateRedirectTo, getSiteOrigin } from "../../../../../lib/utils"

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
      const loginHref = `${siteOrigin}${window.location.pathname
        .replace(/\/admin\/auth\/confirm\/?$/, "/admin/login")}?redirectTo=${encodeURIComponent(redirectTo)}`
      setRetryHref(loginHref)

      console.debug("[auth:confirm] page mounted", {
        href: window.location.href,
        hasHash: Boolean(window.location.hash),
        hashPreview: window.location.hash
          ? window.location.hash.slice(0, 60) + "…"
          : null,
        redirectTo,
        siteOrigin,
      })

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (disposed) return

        if (!session) {
          console.warn(
            "[auth:confirm] no session after getSession — tokens may be missing or expired",
          )
          setStage("error")
          setError(
            "We couldn't find a valid confirmation token in the link. The link may have expired, or you may have opened it on a different device. Please sign in or request a new confirmation by trying to sign up again with the same email.",
          )
          return
        }

        console.debug("[auth:confirm] session established after confirm", {
          userId: session.user.id,
          emailConfirmedAt: session.user.email_confirmed_at ?? null,
          tokenType: (session as any).token_type ?? null,
          expiresIn: session.expires_in ?? null,
        })

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
          console.info(
            "[auth:confirm] admin confirmed — redirecting to destination",
            { redirectTo, userId: session.user.id },
          )
          setStage("success")
          window.location.href = redirectTo
          return
        }

        console.warn(
          "[auth:confirm] email confirmed but user is NOT an admin — signing out locally",
          { userId: session.user.id },
        )
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
        console.error("[auth:confirm] unexpected error during confirm flow", err)
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
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-emerald-700 animate-spin"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                  fillOpacity="0.15"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor"
                />
              </svg>
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
              <a
                className="underline font-medium"
                href={redirectTo}
              >
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
