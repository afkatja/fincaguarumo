import { NextResponse } from "next/server"
import { createSupabaseAdmin } from "@/lib/auth"

/**
 * Diagnostics endpoint for admin sign-up troubleshooting.
 *
 * Accepts an email and returns:
 *   - whether a row exists in auth.users for that email
 *   - whether email is confirmed (email_confirmed_at is set)
 *   - created_at, last_sign_in_at, and user id
 *
 * This endpoint intentionally returns neutral status codes for every case
 * (including "not found") to make it easy to use from the client without
 * handling 4xx responses, but it does not expose whether a given email
 * is registered for any non-admin visitor and requires a valid non-empty
 * email format.
 */
export async function POST(request: Request) {
  const requestId =
    (crypto as any).randomUUID?.() ??
    `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  let email: unknown
  try {
    const body = await request.json()
    email = body?.email
  } catch {
    email = undefined
  }

  const emailStr = typeof email === "string" ? email.trim() : ""

  const emailLooksValid =
    emailStr.length > 0 &&
    emailStr.includes("@") &&
    emailStr.includes(".") &&
    !emailStr.includes(" ")

  const baseLog = {
    requestId,
    emailLooksValid,
    emailDomain: emailLooksValid ? emailStr.split("@")[1] : null,
    ip: request.headers.get("x-forwarded-for") ?? null,
    ua: request.headers.get("user-agent") ?? null,
  }

  if (!emailLooksValid) {
    console.warn("[auth:diag-signup] invalid email input", baseLog)
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_EMAIL",
        exists: false,
        emailConfirmed: false,
      },
      { status: 200 },
    )
  }

  try {
    const supabaseAdmin = createSupabaseAdmin()

    const {
      data: { users },
      error,
    } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })

    if (error) {
      console.error(
        "[auth:diag-signup] listUsers admin call failed",
        baseLog,
        error,
      )
      return NextResponse.json(
        {
          ok: false,
          code: "ADMIN_API_ERROR",
          exists: false,
          emailConfirmed: false,
        },
        { status: 200 },
      )
    }

    void users

    const targetEmail = emailStr.toLowerCase()
    const allUsers: Array<{
      id: string
      email?: string
      created_at?: string
      last_sign_in_at?: string
      email_confirmed_at?: string | null
    }> = []
    let page = 1
    const perPage = 1000
    let hasMore = true

    while (hasMore) {
      const listRes = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      })
      if (listRes.error) {
        console.error(
          "[auth:diag-signup] listUsers pagination failed",
          { ...baseLog, page },
          listRes.error,
        )
        return NextResponse.json(
          {
            ok: false,
            code: "ADMIN_API_ERROR",
            exists: false,
            emailConfirmed: false,
          },
          { status: 200 },
        )
      }
      const pageUsers = listRes.data.users ?? []
      allUsers.push(...pageUsers)
      hasMore = pageUsers.length === perPage
      page++
    }

    const authUser = allUsers.find(
      u => (u.email ?? "").toLowerCase() === targetEmail,
    )

    if (!authUser) {
      console.info(
        "[auth:diag-signup] email not registered in auth.users",
        baseLog,
      )
      return NextResponse.json(
        {
          ok: true,
          code: "NOT_FOUND",
          exists: false,
          emailConfirmed: false,
          created_at: null,
          last_sign_in_at: null,
          email_confirmed_at: null,
          user_id: null,
        },
        { status: 200 },
      )
    }

    const payload = {
      ok: true,
      code: authUser.email_confirmed_at
        ? "FOUND_CONFIRMED"
        : "FOUND_UNCONFIRMED",
      exists: true,
      emailConfirmed: Boolean(authUser.email_confirmed_at),
      created_at: authUser.created_at ?? null,
      last_sign_in_at: authUser.last_sign_in_at ?? null,
      email_confirmed_at: authUser.email_confirmed_at ?? null,
      user_id: authUser.id,
    }

    console.info("[auth:diag-signup] email lookup result", {
      ...baseLog,
      userId: authUser.id,
      emailConfirmedAt: authUser.email_confirmed_at ?? null,
      createdAt: authUser.created_at ?? null,
      lastSignInAt: authUser.last_sign_in_at ?? null,
    })

    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    console.error(
      "[auth:diag-signup] unexpected exception",
      baseLog,
      err instanceof Error ? err : err,
    )
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        exists: false,
        emailConfirmed: false,
      },
      { status: 200 },
    )
  }
}
