# WordPress + React Integration Guide

This guide covers embedding the Moto POS React components into a WordPress site.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  WordPress (PHP)                                            │
│  ├─ Admin UI: Create VCC tokens via Stripe.js               │
│  ├─ REST API: Proxy charge requests to Next.js /api/pos/charge
│  └─ Shortcode/Block: Render React app mount point           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js / React App (separate deployment)                  │
│  ├─ /api/pos/charge → handleChargeRequest (Moto POS)       │
│  ├─ MotoChargePanel widget                                  │
│  └─ Optional: LoginPage for admin auth                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Stripe                                                     │
│  └─ PaymentIntents with moto: true                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. WordPress Side — VCC Token Creation

### Enqueue Stripe.js

```php
// functions.php or plugin
function moto_pos_enqueue_stripe() {
    wp_enqueue_script(
        'stripe-js',
        'https://js.stripe.com/v3/',
        [],
        null,
        true
    );
    wp_add_inline_script('stripe-js', 'window.Stripe = Stripe("' . esc_js(MOTO_POS_STRIPE_PUBLISHABLE_KEY) . '");');
}
add_action('wp_enqueue_scripts', 'moto_pos_enqueue_stripe');
```

### Create VCC PaymentMethod (client-side)

```javascript
// assets/js/vcc-handler.js
async function createVccPaymentMethod(cardDetails) {
  const stripe = window.Stripe;
  const { paymentMethod, error } = await stripe.createPaymentMethod({
    type: 'card',
    card: cardDetails,
    billing_details: {
      name: cardDetails.name,
      email: cardDetails.email,
    },
  });
  
  if (error) throw new Error(error.message);
  return paymentMethod.id; // pm_xxx
}

// Usage with VCC form
document.getElementById('vcc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pmId = await createVccPaymentMethod({
    number: document.getElementById('vcc-number').value,
    exp_month: document.getElementById('vcc-exp-month').value,
    exp_year: document.getElementById('vcc-exp-year').value,
    cvc: document.getElementById('vcc-cvc').value,
    name: 'Booking.com VCC',
  });
  // Store pmId for charge request
});
```

---

## 2. WordPress REST API Proxy

### Register Custom Endpoint

```php
// includes/class-moto-pos-api.php
class Moto_POS_API {
  private $nextjs_url;
  private $jwt_secret;

  public function __construct() {
    $this->nextjs_url = get_option('moto_pos_nextjs_url', 'https://your-app.com');
    $this->jwt_secret = get_option('moto_pos_jwt_secret', '');
    
    add_action('rest_api_init', [$this, 'register_routes']);
  }

  public function register_routes() {
    register_rest_route('moto-pos/v1', '/charge', [
      'methods' => 'POST',
      'callback' => [$this, 'handle_charge'],
      'permission_callback' => [$this, 'verify_admin'],
    ]);
  }

  public function verify_admin($request) {
    // Verify current user is admin
    return current_user_can('manage_options');
  }

  public function handle_charge($request) {
    $params = $request->get_json_params();
    
    // Generate JWT for Next.js auth
    $token = $this->generate_jwt(get_current_user_id());
    
    // Proxy to Next.js
    $response = wp_remote_post($this->nextjs_url . '/api/pos/charge', [
      'headers' => [
        'Authorization' => 'Bearer ' . $token,
        'Content-Type' => 'application/json',
      ],
      'body' => json_encode($params),
      'timeout' => 30,
    ]);

    if (is_wp_error($response)) {
      return new WP_Error('proxy_failed', $response->get_error_message(), ['status' => 502]);
    }

    $status = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status >= 400) {
      return new WP_Error('charge_failed', $body['error'] ?? 'Unknown error', ['status' => $status, 'data' => $body]);
    }

    return $body;
  }

  private function generate_jwt($user_id) {
    // Use firebase/php-jwt or similar
    $payload = [
      'sub' => (string)$user_id,
      'email' => get_userdata($user_id)->user_email,
      'app_metadata' => ['role' => 'admin'],
      'exp' => time() + 3600,
    ];
    return \Firebase\JWT\JWT::encode($payload, $this->jwt_secret, 'HS256');
  }
}
new Moto_POS_API();
```

---

## 3. React App — Next.js Setup

### Install Moto POS

```bash
npm install @moto-pos/core @tanstack/react-query
```

### Create Charge Route

```tsx
// app/api/pos/charge/route.ts
import { createNextRouteHandler } from '@moto-pos/core/http/next'
import { createStripeAdapter } from '@moto-pos/core/adapters/stripe-adapter'
import { createSupabaseAuthProvider } from '@moto-pos/core/adapters/supabase-auth'

const stripe = createStripeAdapter(process.env.STRIPE_API_KEY!)
const auth = createSupabaseAuthProvider(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  process.env.SUPABASE_JWT_SECRET
)

export const POST = createNextRouteHandler({ stripe, auth })
```

### Mount MotoChargePanel

```tsx
// app/components/ChargeWidget.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StringsProvider } from '@moto-pos/core/strings'
import { MotoChargePanel } from '@moto-pos/core/react'
import { defaultTokens } from '@moto-pos/core/tokens'
import '@moto-pos/core/tokens.css'
import { useEffect } from 'react'

const queryClient = new QueryClient()

export function ChargeWidget({ 
  defaultAmount, 
  defaultCurrency,
  reservationId,
}: { 
  defaultAmount?: number
  defaultCurrency?: string
  reservationId?: string
}) {
  // Generate idempotency key from reservation
  const idempotencyKey = `booking-vcc:${reservationId}:${Math.round((defaultAmount || 0) * 100)}:${defaultCurrency || 'usd'}`

  return (
    <QueryClientProvider client={queryClient}>
      <StringsProvider>
        <div className="moto-pos">
          <MotoChargePanel
            defaultAmount={defaultAmount}
            defaultCurrency={defaultCurrency}
            onSuccess={(result) => {
              console.log('Charge succeeded:', result)
              // Notify WordPress via postMessage or callback
              window.parent?.postMessage({ type: 'MOTO_CHARGE_SUCCESS', payload: result }, '*')
            }}
            onRequiresAction={(clientSecret, paymentIntentId) => {
              // Handle 3DS - redirect to Stripe or use stripe.confirmCardPayment
              window.parent?.postMessage({ 
                type: 'MOTO_CHARGE_REQUIRES_ACTION', 
                payload: { clientSecret, paymentIntentId } 
              }, '*')
            }}
            onError={(error) => {
              window.parent?.postMessage({ type: 'MOTO_CHARGE_ERROR', payload: error.message }, '*')
            }}
          />
        </div>
      </StringsProvider>
    </QueryClientProvider>
  )
}
```

### WordPress Shortcode

```tsx
// app/wordpress/ChargeShortcode.tsx
'use client'

export function ChargeShortcode({ 
  amount = 0, 
  currency = 'usd',
  reservation = '',
}) {
  return (
    <div id="moto-pos-mount" data-amount={amount} data-currency={currency} data-reservation={reservation}>
      <ChargeWidget 
        defaultAmount={amount} 
        defaultCurrency={currency}
        reservationId={reservation}
      />
    </div>
  )
}
```

---

## 4. WordPress Shortcode Registration

```php
// includes/shortcodes.php
function moto_pos_charge_shortcode($atts) {
  $atts = shortcode_atts([
    'amount' => 0,
    'currency' => 'usd',
    'reservation' => '',
    'class' => '',
  ], $atts, 'moto_pos_charge');

  // In production, render a mount point for React
  // The React app should be loaded separately
  return sprintf(
    '<div id="moto-pos-charge-%s" class="moto-pos-charge-widget %s" data-amount="%s" data-currency="%s" data-reservation="%s"></div>',
    esc_attr($atts['reservation']),
    esc_attr($atts['class']),
    esc_attr($atts['amount']),
    esc_attr($atts['currency']),
    esc_attr($atts['reservation'])
  );
}
add_shortcode('moto_pos_charge', 'moto_pos_charge_shortcode');

// Enqueue React app
function moto_pos_enqueue_react_app() {
  wp_enqueue_script(
    'moto-pos-react',
    'https://your-nextjs-app.com/moto-pos-widget.js', // Built bundle
    [],
    '1.0.0',
    true
  );
}
add_action('wp_enqueue_scripts', 'moto_pos_enqueue_react_app');
```

**Usage in WordPress editor:**
```html
[moto_pos_charge amount="150.00" currency="usd" reservation="RES-123"]
```

---

## 5. Alternative: iframe Embed

If you cannot run a separate Next.js app, embed via iframe:

```php
function moto_pos_iframe_shortcode($atts) {
  $atts = shortcode_atts([
    'amount' => 0,
    'currency' => 'usd',
    'reservation' => '',
  ], $atts, 'moto_pos_iframe');

  $params = http_build_query([
    'amount' => $atts['amount'],
    'currency' => $atts['currency'],
    'reservation' => $atts['reservation'],
  ]);

  return sprintf(
    '<iframe src="https://your-app.com/pos/charge?%s" 
      width="100%%" height="500" frameborder="0" 
      style="border-radius: var(--moto-pos-radius-lg); border: 1px solid var(--moto-pos-color-border);"
      allow="payment">
    </iframe>',
    esc_attr($params)
  );
}
add_shortcode('moto_pos_iframe', 'moto_pos_iframe_shortcode');
```

---

## 6. Admin Promotion Script

See `scripts/set-admin.ts` for promoting users to admin via Supabase.

```bash
# Promote user to admin
npx tsx scripts/set-admin.ts --email admin@example.com --project your-project-ref
```

---

## 7. Environment Variables Checklist

### Next.js App (.env.local)
```env
STRIPE_API_KEY=sk_live_...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...  # From Supabase Dashboard → Settings → API
```

### WordPress (wp-config.php or options table)
```php
define('MOTO_POS_NEXTJS_URL', 'https://your-app.com');
define('MOTO_POS_STRIPE_PUBLISHABLE_KEY', 'pk_live_...');
define('MOTO_POS_JWT_SECRET', 'shared-secret-for-jwt'); // Must match SUPABASE_JWT_SECRET
```

---

## 8. Security Notes

1. **JWT Secret**: Share `SUPABASE_JWT_SECRET` between WordPress and Next.js for zero-DB auth
2. **CORS**: Configure Next.js to accept requests from your WordPress domain
3. **Rate Limiting**: Implement queuing on WordPress side (2 req/sec max sustained)
4. **HTTPS Required**: Stripe.js and PaymentIntents require HTTPS
5. **Idempotency**: Always use unique `idempotencyKey` per charge attempt

---

## 9. Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT secret matches; verify user has `app_metadata.role: admin` |
| 403 Forbidden | WordPress user lacks `manage_options`; Supabase user not admin |
| 422 Requires Action | Handle 3DS on client; pass `clientSecret` to `stripe.confirmCardPayment()` |
| CORS Error | Add WordPress domain to Next.js `next.config.js` `async headers()` |
| VCC Declined | Verify VCC is valid, not expired, has sufficient balance |

---

## 10. Production Checklist

- [ ] Stripe live keys configured
- [ ] Supabase JWT secret shared between WP and Next.js
- [ ] CORS headers configured on Next.js
- [ ] WordPress proxy endpoint tested with admin user
- [ ] Idempotency key format validated
- [ ] Rate limiting implemented on WP side
- [ ] Error logging/monitoring in place
- [ ] 3DS flow tested end-to-end
- [ ] Rollback plan for failed deployments