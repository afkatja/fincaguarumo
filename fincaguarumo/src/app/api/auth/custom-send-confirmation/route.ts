import { NextResponse } from "next/server"
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend"
import { createSupabaseAdmin } from "@/lib/auth"
import { getSiteOrigin } from "@/lib/utils"
import crypto from "node:crypto"

/**
 * Custom admin sign-up confirmation email sender.
 *
 * Supabase's built-in SMTP pool has a low hourly/daily rate limit that
 * blocks sign-up confirmation emails when several people sign up in a short
 * window. This route replaces Supabase's built-in sender with MailerSend,
 * using the same API key the booking confirmation emails already use.
 *
 * Callers:
 *   1. A Postgres AFTER INSERT trigger on auth.users (see migration 016)
 *      via pg_net.http_post. This is the "fire and forget" hook that runs
 *      inside Supabase whenever a user signs up.
 *   2. The admin sign-up page (/[locale]/admin/login) when
 *      NEXT_PUBLIC_USE_CUSTOM_AUTH_SMTP=true and signUp() succeeds but the
 *      user is still unconfirmed. This lets the client explicitly re-send
 *      a fresh link (e.g. on preview deploys where you want a host-specific
 *      redirect URL that isn't the global Site URL).
 *
 * Authentication (required):
 *   - The caller MUST set the `X-Webhook-Secret` header to the value of
 *     SUPABASE_AUTH_WEBHOOK_SECRET.
 *   - OR the caller MUST include `signature` and `nonce` fields in the JSON
 *     payload, where `signature = hex(HMAC-SHA-256(payload_json, secret))`.
 *     This is the mode used by the Postgres trigger, which cannot access
 *     environment variables during HMAC verification, but can embed a
 *     signed payload.
 *
 * Request body:
 *   {
 *     email: string,                  // required
 *     user_id?: string,               // auth.users.id (helps logs)
 *     redirectTo?: string,            // absolute URL to return to after confirm
 *     locale?: string,                // preferred language hint
 *     signature?: string,             // HMAC-SHA-256(JSON.stringify(sans-signature), secret)
 *     nonce?: string,                 // timestamp/id used to build the HMAC
 *   }
 */
export async function POST(request: Request) {
  const requestId =
    (crypto.randomUUID as any)?.() ??
    `send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const now = new Date().toISOString()
  let rawBody = "{}"
  try {
    rawBody = await request.text()
  } catch {
    rawBody = "{}"
  }

  let body: any = {}
  try {
    body = JSON.parse(rawBody || "{}")
  } catch {
    body = {}
  }

  const email: string = typeof body?.email === "string" ? body.email.trim() : ""
  const userId: string | undefined =
    typeof body?.user_id === "string" && body.user_id.length > 0
      ? body.user_id
      : undefined
  const redirectTo: string | undefined =
    typeof body?.redirectTo === "string" && body.redirectTo.startsWith("http")
      ? body.redirectTo
      : undefined
  const locale: string | undefined =
    typeof body?.locale === "string" ? body.locale : undefined
  const suppliedSignature: string | undefined =
    typeof body?.signature === "string" ? body.signature : undefined
  const nonce: string | undefined =
    typeof body?.nonce === "string" ? body.nonce : undefined
  const headerSecret: string | undefined =
    request.headers.get("x-webhook-secret")?.toString() ?? undefined

  const baseLog = {
    requestId,
    at: now,
    emailDomain: email.includes("@") ? email.split("@")[1] : null,
    hasUserId: Boolean(userId),
    hasRedirectTo: Boolean(redirectTo),
    locale,
    nonce,
    authMode: suppliedSignature ? "hmac" : headerSecret ? "header" : "none",
    ip: request.headers.get("x-forwarded-for") ?? null,
    ua: request.headers.get("user-agent") ?? null,
  }

  const sharedSecret = process.env.SUPABASE_AUTH_WEBHOOK_SECRET || ""
  if (!sharedSecret) {
    console.error(
      "[auth:custom-send-confirmation] misconfigured: SUPABASE_AUTH_WEBHOOK_SECRET env var is empty",
      baseLog,
    )
    return NextResponse.json(
      {
        ok: false,
        code: "MISCONFIGURED",
        sent: false,
      },
      { status: 500 },
    )
  }

  // --- Authentication -----------------------------------------------------
  let authenticated = false
  if (headerSecret && headerSecret === sharedSecret) {
    authenticated = true
  } else if (suppliedSignature) {
    try {
      // Re-serialize everything except "signature" to the same JSON text
      // used when the trigger built the HMAC. The Postgres trigger uses
      // JSONB ordering, but we strip "signature" from the body and
      // canonicalize with JSON.stringify(JSON.parse(...)) to stay robust.
      const { signature: _sig, ...rest } = body
      const canonical = JSON.stringify(rest)
      const expected = crypto
        .createHmac("sha256", sharedSecret)
        .update(canonical)
        .digest("hex")
      authenticated = crypto.timingSafeEqual(
        Buffer.from(suppliedSignature),
        Buffer.from(expected),
      )
    } catch {
      authenticated = false
    }
  }

  if (!authenticated) {
    console.warn(
      "[auth:custom-send-confirmation] authentication failed for request",
      baseLog,
    )
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHENTICATED",
        sent: false,
      },
      { status: 401 },
    )
  }

  const emailLooksValid =
    email.length > 0 &&
    email.includes("@") &&
    email.includes(".") &&
    !email.includes(" ")

  if (!emailLooksValid) {
    console.warn(
      "[auth:custom-send-confirmation] bad email input",
      baseLog,
    )
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_EMAIL",
        sent: false,
      },
      { status: 400 },
    )
  }

  try {
    const siteOrigin = getSiteOrigin()
    const finalRedirectTo =
      redirectTo ?? `${siteOrigin}/admin/auth/confirm`

    const supabaseAdmin = createSupabaseAdmin()
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_TOKEN || "",
    })
    const fromEmail = process.env.MAILERSEND_FROM_EMAIL || "info@fincaguarumo.com"
    const fromName = "Finca Guarumo Admin"
    const contactEmail = process.env.CONTACT_EMAIL || fromEmail

    // --- Build a fresh confirmation/action link via Supabase admin API -----
    const genRes = await (supabaseAdmin.auth.admin as any).generateLink?.({
      type: "signup",
      email,
      password:
        typeof body?.password === "string" && body.password.length > 0
          ? body.password
          : `Adm!n-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,
      options: {
        redirectTo: finalRedirectTo,
        data: {
          _admin_onboarding: true,
          _custom_smtp_sent_at: now,
          _request_id: requestId,
          ...(locale ? { locale } : {}),
        },
      },
    })

    let actionLink: string | null = null
    let generateLinkCode: string | null = null
    if (!genRes) {
      console.error(
        "[auth:custom-send-confirmation] generateLink not available on this Supabase SDK",
        baseLog,
      )
      generateLinkCode = "GENERATE_LINK_UNAVAILABLE"
    } else if (genRes.error) {
      console.error(
        "[auth:custom-send-confirmation] generateLink error",
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
      generateLinkCode = `GENERATE_LINK_ERROR:${(genRes.error as any).code ?? genRes.error.name}`
    } else {
      actionLink =
        (genRes.data as any)?.properties?.email_action_link ??
        (genRes.data as any)?.email_action_link ??
        null
      if (!actionLink) {
        console.warn(
          "[auth:custom-send-confirmation] generateLink returned no email_action_link",
          { ...baseLog, keys: Object.keys(genRes.data ?? {}) },
        )
        generateLinkCode = "GENERATE_LINK_NO_ACTION_LINK"
      } else {
        generateLinkCode = "GENERATE_LINK_OK"
      }
    }

    // --- Render MailerSend email ------------------------------------------
    const confirmUrl = actionLink || finalRedirectTo
    const subject =
      locale === "es"
        ? "Confirma tu correo para el panel de Finca Guarumo"
        : locale === "nl"
          ? "Bevestig je e-mail voor het Finca Guarumo dashboard"
          : locale === "de"
            ? "Bestätige deine E-Mail für das Finca Guarumo Dashboard"
            : locale === "ru"
              ? "Подтвердите адрес электронной почты для панели Finca Guarumo"
              : "Confirm your email for the Finca Guarumo admin dashboard"

    const intro =
      locale === "es"
        ? "Por favor, confirma tu dirección de correo para completar la creación de tu cuenta de administrador."
        : locale === "nl"
          ? "Bevestig je e-mailadres om je admin-account aanmaken af te ronden."
          : locale === "de"
            ? "Bitte bestätige deine E-Mail-Adresse, um die Erstellung deines Admin-Kontos abzuschließen."
            : locale === "ru"
              ? "Пожалуйста, подтвердите адрес электронной почты, чтобы завершить создание учетной записи администратора."
              : "Please confirm your email address to complete the creation of your admin account."

    const outro =
      locale === "es"
        ? `Si no creaste esta cuenta, ignora este mensaje o escribe a ${contactEmail}.`
        : locale === "nl"
          ? `Als je deze account niet hebt aangemaakt, negeer dit bericht of mail ${contactEmail}.`
          : locale === "de"
            ? `Wenn du dieses Konto nicht erstellt hast, ignoriere diese E-Mail oder schreibe an ${contactEmail}.`
            : locale === "ru"
              ? `Если вы не создавали эту учетную запись, проигнорируйте это письмо или напишите на ${contactEmail}.`
              : `If you did not create this account, ignore this message or email ${contactEmail}.`

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Helvetica, Arial, sans-serif; color: #111; line-height: 1.5;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="padding: 32px 16px; background: ${locale === "es" ? "#f9f2d8" : "#f9f2d8"};">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px;">
                <tr>
                  <td align="left" style="padding: 24px; background: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                    <img alt="Finca Guarumo" height="56" src="https://fincaguarumo.com/logo-single.png" style="height: 56px; width: auto; display: block;" />
                    <h1 style="margin: 24px 0 12px 0; font-size: 24px; color: #034b25;">${subject}</h1>
                    <p style="margin: 0 0 24px 0; color: #18181b;">${intro}</p>
                    <div style="margin: 0 0 24px 0;">
                      <a href="${confirmUrl}"
                         style="display:inline-block; background: #034b25; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 10px; font-weight: 600;">
                        Confirm email address
                      </a>
                    </div>
                    <p style="margin: 0 0 8px 0; color: #3f3f46; font-size: 14px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 24px 0; color: #18181b; word-break: break-all; font-size: 14px;">
                      <a href="${confirmUrl}" style="color: #9d1f60;">${confirmUrl}</a>
                    </p>
                    <p style="margin: 0; color: #52525b; font-size: 13px;">${outro}</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 24px 0 0 0; color: #71717a; font-size: 12px;">
                    Finca Guarumo &middot; Calle La Balsa, Puerto Jiménez, Costa Rica &middot; ${contactEmail}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `

    const textBody = [
      subject,
      "",
      intro,
      "",
      "Confirm your email:",
      confirmUrl,
      "",
      outro,
      "",
      "-- Finca Guarumo Admin",
      contactEmail,
    ].join("\n")

    const emailParams = new EmailParams()
      .setFrom(new Sender(fromEmail, fromName))
      .setTo([new Recipient(email, email.split("@")[0])])
      .setReplyTo(new Sender(contactEmail, "Finca Guarumo Support"))
      .setSubject(subject)
      .setHtml(htmlBody)
      .setText(textBody)
      .setPersonalization([
        {
          email,
          data: {
            confirm_url: confirmUrl,
            locale: locale ?? "en",
            account_name: "Finca Guarumo",
            account_support_email: contactEmail,
          },
        },
      ])

    let mailerSendResult: { ok: boolean; error?: any; httpCode?: number } = {
      ok: false,
    }
    try {
      if (!process.env.MAILERSEND_TOKEN) {
        throw new Error("MAILERSEND_TOKEN env var is empty")
      }
      const msRes = await mailerSend.email.send(emailParams)
      mailerSendResult = {
        ok: true,
        httpCode: (msRes as any)?.statusCode ?? 200,
      }
    } catch (err: any) {
      mailerSendResult = {
        ok: false,
        error:
          err?.response?.body ??
          err?.message ??
          String(err),
      }
    }

    const sent = mailerSendResult.ok

    const logObj = {
      ...baseLog,
      generateLinkCode,
      finalRedirectTo,
      generatedActionLink: actionLink ? actionLink.split("?")[0] + "?..." : null,
      sent,
      mailerSendHttpCode: mailerSendResult.httpCode ?? null,
      mailerSendError: mailerSendResult.error ?? null,
    }

    if (sent) {
      console.info(
        "[auth:custom-send-confirmation] confirmation email sent",
        logObj,
      )
    } else {
      console.error(
        "[auth:custom-send-confirmation] failed to send confirmation email",
        logObj,
      )
    }

    return NextResponse.json(
      {
        ok: sent,
        code: sent ? "SENT" : generateLinkCode ?? "MAILERSEND_ERROR",
        sent,
        generateLinkCode,
        redirectTo: finalRedirectTo,
      },
      { status: sent ? 200 : 502 },
    )
  } catch (err) {
    console.error(
      "[auth:custom-send-confirmation] unexpected exception",
      baseLog,
      err instanceof Error ? err : err,
    )
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        sent: false,
      },
      { status: 500 },
    )
  }
}
