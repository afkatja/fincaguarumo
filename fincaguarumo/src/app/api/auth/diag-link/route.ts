import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"
import { getSiteOrigin } from "@/lib/utils"

/**
 * Uses the Supabase admin API (service role) to simulate exactly what Supabase
 * would put inside a sign-up confirmation email when given a specific
 * emailRedirectTo.
 *
 * This route is used as a PRE-FLIGHT diagnostic before a real signUp call:
 *   - we call `auth.admin.generateLink({ type: 'signup', options: { redirectTo } })`
 *   - the returned `data.properties.email_action_link` is the exact URL that
 *     would be clicked by the user in their inbox
 *   - we compare the origin of that generated link with the origin we
 *     requested: if they differ, Supabase silently rewrote the redirect
 *     (typically because our host is not in the Redirect URLs allowlist in
 *     the Supabase dashboard and GoTrue falls back to the configured Site URL)
 *
 * Returns:
 *   {
 *     ok: boolean
 *     requestedRedirectTo: string
 *     generatedActionLink: string | null
 *     requestedOrigin: string
 *     generatedOrigin: string | null
 *     originRewritten: boolean
 *     mismatchAdvice: string | null
 *   }
 */
export async function POST(request: Request) {
  const requestId =
    (crypto as any).randomUUID?.() ??
    `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  let payload: any
  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const email =
    typeof payload?.email === "string" ? payload.email.trim() : "diag@example.com"
  const password =
    typeof payload?.password === "string" && payload.password.length > 0
      ? payload.password
      : "Diag0n!yPass" + Math.random().toString(36).slice(2, 10)

  // Accept an explicit emailRedirectTo or construct one with the same rules
  // the client would use. Accepting an override means we can diagnose the
  // exact same value the login page would have sent.
  const requestedRedirectTo: string =
    typeof payload?.emailRedirectTo === "string" && payload.emailRedirectTo.length > 0
      ? payload.emailRedirectTo
      : (() => {
          const siteOrigin = getSiteOrigin()
          return `${siteOrigin}/admin/auth/confirm`
        })()

  let requestedOrigin: string
  try {
    requestedOrigin = new URL(requestedRedirectTo).origin
  } catch {
    requestedOrigin = requestedRedirectTo
  }

  const baseLog = {
    requestId,
    emailDomain: email.split("@")[1] ?? "unknown",
    requestedRedirectTo,
    requestedOrigin,
    ip: request.headers.get("x-forwarded-for") ?? null,
    ua: request.headers.get("user-agent") ?? null,
  }

  try {
    const supabaseAdmin = createSupabaseAdmin()

    const genRes = await (supabaseAdmin.auth.admin as any).generateLink?.({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: requestedRedirectTo,
        data: { _diagnostic: true, _requestId: requestId },
      },
    })

    if (!genRes) {
      console.error(
        "[auth:diag-link] generateLink is unavailable on this Supabase SDK version",
        baseLog,
      )
      return NextResponse.json(
        {
          ok: false,
          code: "GENERATE_LINK_UNAVAILABLE",
          requestedRedirectTo,
          requestedOrigin,
          generatedActionLink: null,
          generatedOrigin: null,
          originRewritten: null,
          mismatchAdvice: null,
        },
        { status: 200 },
      )
    }

    if (genRes.error) {
      console.error(
        "[auth:diag-link] generateLink returned an error",
        {
          ...baseLog,
          error: {
            name: genRes.error.name,
            code: (genRes.error as any).code,
            status: (genRes.error as any).status,
            message: genRes.error.message,
          },
        },
      )
      return NextResponse.json(
        {
          ok: false,
          code: "GENERATE_LINK_ERROR",
          error: {
            name: genRes.error.name,
            code: (genRes.error as any).code,
            message: genRes.error.message,
          },
          requestedRedirectTo,
          requestedOrigin,
          generatedActionLink: null,
          generatedOrigin: null,
          originRewritten: null,
          mismatchAdvice: null,
        },
        { status: 200 },
      )
    }

    const generatedActionLink: string | null =
      (genRes.data as any)?.properties?.email_action_link ??
      (genRes.data as any)?.email_action_link ??
      null

    let generatedOrigin: string | null = null
    if (generatedActionLink) {
      try {
        generatedOrigin = new URL(generatedActionLink).origin
      } catch {
        generatedOrigin = null
      }
    }

    const originRewritten = Boolean(
      generatedOrigin && generatedOrigin.toLowerCase() !== requestedOrigin.toLowerCase(),
    )

    let mismatchAdvice: string | null = null
    if (originRewritten) {
      mismatchAdvice = [
        `SUPABASE REDIRECT MISMATCH (requested ${requestedOrigin}, but email link will go to ${generatedOrigin}).`,
        "Supabase silently falls back to its configured Site URL whenever the requested emailRedirectTo's origin+path does not prefix-match any entry in Authentication → URL Configuration → Redirect URLs in the Supabase dashboard.",
        `To fix: add "${requestedOrigin}/*" (or at minimum "${requestedRedirectTo}") to the Redirect URLs in the Supabase dashboard.`,
        `For Netlify PR previews that get a new subdomain per PR, you can allowlist a wildcard if your plan supports it (e.g. "https://*--fincaguarumo.netlify.app/*") or set NEXT_PUBLIC_SITE_URL and emailRedirectTo to a stable host you control.`,
      ].join(" ")
      console.warn("[auth:diag-link] ORIGIN REWRITTEN BY SUPABASE", {
        ...baseLog,
        generatedActionLink,
        generatedOrigin,
        originRewritten,
      })
    } else if (generatedActionLink) {
      console.info("[auth:diag-link] redirect origin matches — no rewrite", {
        ...baseLog,
        generatedOrigin,
      })
    } else {
      console.warn("[auth:diag-link] no email_action_link in generateLink response", {
        ...baseLog,
        genResKeys: Object.keys(genRes.data ?? {}),
      })
    }

    return NextResponse.json(
      {
        ok: true,
        requestedRedirectTo,
        requestedOrigin,
        generatedActionLink,
        generatedOrigin,
        originRewritten,
        mismatchAdvice,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error(
      "[auth:diag-link] unexpected exception",
      baseLog,
      err instanceof Error ? err : err,
    )
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        requestedRedirectTo,
        requestedOrigin,
        generatedActionLink: null,
        generatedOrigin: null,
        originRewritten: null,
        mismatchAdvice: null,
      },
      { status: 200 },
    )
  }
}
