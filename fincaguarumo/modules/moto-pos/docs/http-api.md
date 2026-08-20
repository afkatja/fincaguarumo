# HTTP API Contract — MOTO POS Module

## Overview

This document describes the HTTP interface for creating MOTO (Mail Order / Telephone Order) charges via Stripe. Designed for WordPress → React embed scenarios and direct API consumers.

---

## Endpoint

```
POST /api/pos/charge
```

---

## Authentication

**Required:** `Authorization: Bearer <JWT>` header

The JWT must:
- Be a valid Supabase access token (or compatible JWT)
- Contain `app_metadata.role === "admin"` (or `app_metadata.roles` array including `"admin"`)
- Not be expired (`exp` claim)

**Alternative:** Configure `SUPABASE_JWT_SECRET` for zero-DB JWT verification. Without it, falls back to Supabase DB lookup.

### Error Responses

| Status | Condition |
|--------|-----------|
| 401 | Missing/invalid/expired token |
| 403 | Valid token but not admin |
| 500 | Auth service unavailable |

---

## Request Body

```json
{
  "amount": 150000,
  "currency": "usd",
  "paymentMethodId": "pm_card_visa",
  "idempotencyKey": "booking-vcc:res_123:150000:usd",
  "description": "Booking.com VCC reservation RES-123",
  "metadata": {
    "reservation_id": "res_123",
    "source": "booking_com_vcc"
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | integer | **Yes** | Amount in **cents** (positive, max 1,000,000 = $10,000) |
| `currency` | string | **Yes** | ISO-4217 code (allowed: `usd`, `eur`, `gbp`, `crc`) |
| `paymentMethodId` | string | **Yes** | Stripe PaymentMethod ID (must start with `pm_`) |
| `idempotencyKey` | string | **Yes** | Unique key preventing double-charge. **Format:** `{prefix}:{id}:{amount}:{currency}` (default prefix: `booking-vcc`) |
| `description` | string | No | Appears on Stripe dashboard |
| `metadata` | object | No | Arbitrary key-value pairs stored on PaymentIntent |

---

## Idempotency Key Format

```
{prefix}:{internal_id}:{amount_cents}:{currency}
```

**Examples:**
- `booking-vcc:res_123:150000:usd`
- `booking-vcc:manual_abc:50000:eur`

The module validates the prefix matches config (`MOTO_POS_IDEMPOTENCY_PREFIX`). Consumer must ensure uniqueness per charge attempt.

---

## Success Response (200)

```json
{
  "paymentIntentId": "pi_3Rq9...",
  "status": "succeeded"
}
```

---

## Requires Action (422)

3D Secure or other customer action required.

```json
{
  "error": "Payment requires additional authentication (3D Secure)",
  "status": "requires_action",
  "clientSecret": "pi_3Rq9..._secret_xyz",
  "paymentIntentId": "pi_3Rq9..."
}
```

**Consumer action:** Use `clientSecret` with `stripe.confirmCardPayment()` or `stripe.handleCardAction()` on client side.

---

## Error Responses

### 400 — Validation Failed

```json
{
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "Amount must be positive" },
    { "field": "currency", "message": "Currency must be one of: USD, EUR, GBP, CRC" }
  ]
}
```

### 402 — Card Declined

```json
{ "error": "Your card was declined." }
```

### 403 — Not Admin

```json
{ "error": "Admin access required" }
```

### 404 — Not Found (if using booking lookup)

Not returned by module directly; consumer should resolve booking before calling.

### 422 — Payment Failed

```json
{
  "error": "Stripe payment status: failed",
  "status": "failed",
  "paymentIntentId": "pi_3Rq9..."
}
```

### 500 — Internal Error

```json
{ "error": "Internal server error" }
```

---

## Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `STRIPE_API_KEY` | **required** | Stripe secret key |
| `MOTO_POS_MAX_AMOUNT_CENTS` | `1000000` | Maximum charge amount |
| `MOTO_POS_ALLOWED_CURRENCIES` | `usd,eur,gbp,crc` | Comma-separated allowed currencies |
| `MOTO_POS_IDEMPOTENCY_PREFIX` | `booking-vcc` | Prefix for idempotency key validation |
| `SUPABASE_URL` | — | For JWT fallback verification |
| `SUPABASE_SERVICE_ROLE_KEY` | — | For JWT fallback verification |
| `SUPABASE_JWT_SECRET` | — | Enables zero-DB JWT verification |

---

## WordPress Integration

### PHP Example (wp_remote_post)

```php
$response = wp_remote_post('https://your-app.com/api/pos/charge', [
    'headers' => [
        'Authorization' => 'Bearer ' . $admin_jwt,
        'Content-Type'  => 'application/json',
    ],
    'body' => json_encode([
        'amount'            => 150000,           // $1,500.00
        'currency'          => 'usd',
        'paymentMethodId'   => $vcc_token,       // From Stripe.js on WP side
        'idempotencyKey'    => 'booking-vcc:' . $reservation_id . ':150000:usd',
        'description'       => "Booking.com VCC reservation {$reservation_id}",
        'metadata'          => [
            'reservation_id' => $reservation_id,
            'source'         => 'booking_com_vcc',
        ],
    ]),
    'timeout' => 30,
]);

if (is_wp_error($response)) {
    // Handle connection error
    return;
}

$body = json_decode($response['body'], true);
$status = $response['response']['code'];

switch ($status) {
    case 200:
        // Success - paymentIntentId in $body['paymentIntentId']
        break;
    case 422:
        if ($body['status'] === 'requires_action') {
            // Pass $body['clientSecret'] to frontend for 3DS
        }
        break;
    default:
        // Log $body['error']
}
```

### Rate Limiting Note

Stripe allows ~100 write ops/sec. WordPress cron or batch jobs should **queue charges** and respect **2 requests/second** sustained to avoid 429s. Implement exponential backoff.

---

## React Integration

```tsx
import { useCharge } from '@moto-pos/react'

function ChargeButton() {
  const { mutate, isPending, error } = useCharge()

  const handleCharge = () => {
    mutate({
      amount: 150000,
      currency: 'usd',
      paymentMethodId: 'pm_card_visa',
      idempotencyKey: 'booking-vcc:res_123:150000:usd',
    })
  }

  return (
    <button onClick={handleCharge} disabled={isPending}>
      {isPending ? 'Charging...' : 'Charge $1,500'}
    </button>
  )
}
```

---

## Testing with curl

```bash
curl -X POST https://your-app.com/api/pos/charge \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "paymentMethodId": "pm_card_visa",
    "idempotencyKey": "booking-vcc:test_1:1000:usd"
  }'
```