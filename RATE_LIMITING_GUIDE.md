# Rate Limiting Configuration

## Overview

The application implements strict rate limiting calibrated for realistic human usage patterns to prevent abuse while allowing genuine users to interact normally.

## Current Rate Limits

| Endpoint | Limit | Window | Preset | Use Case |
|----------|-------|--------|--------|----------|
| `/api/contact` | 3 requests | 10 minutes | `contactForm` | Prevent contact spam - genuine users rarely retry more than 1-2 times |
| `/api/orders/create` | 5 requests | 15 minutes | `orderCreation` | Prevent order spam - paying customers rarely retry rapidly |
| `/api/auth/callback` | 5 requests | 10 minutes | `auth` | Prevent OAuth abuse - allows genuine redirects and typos/retries |
| `/api/admin/orders/*/status` | 30 requests | 60 seconds | `admin` | Prevent runaway scripts while allowing admin work |
| `/api/admin/orders/*/upload` | 30 requests | 60 seconds | `admin` | Prevent bulk upload abuse |

## Rate Limit Presets

Located in `lib/rate-limit.ts`:

```typescript
export const RateLimitPresets = {
  /** Contact form - 3 requests per 10 minutes */
  contactForm: { limit: 3, windowSeconds: 600 },
  
  /** Order creation - 5 requests per 15 minutes */
  orderCreation: { limit: 5, windowSeconds: 900 },
  
  /** Auth attempts - 5 requests per 10 minutes */
  auth: { limit: 5, windowSeconds: 600 },
  
  /** Admin operations - 30 requests per minute */
  admin: { limit: 30, windowSeconds: 60 },
} as const
```

## User-Friendly Error Messages

When rate limits are exceeded, users receive clear messages indicating when they can try again:

### Examples:

- **Within 60 seconds**: "Too many requests. Please try again in 45 seconds."
- **More than 60 seconds**: "Too many requests. Please try again in 8 minutes."

The message is generated dynamically based on the reset time.

### Implementation:

```typescript
export function getRateLimitErrorMessage(resetAt: number): string {
  const now = Date.now()
  const secondsRemaining = Math.ceil((resetAt - now) / 1000)

  if (secondsRemaining <= 60) {
    return `Too many requests. Please try again in ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}.`
  }

  const minutesRemaining = Math.ceil(secondsRemaining / 60)
  return `Too many requests. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
}
```

## Rate Limit Headers

All rate-limited endpoints return these headers:

```
X-RateLimit-Limit: <limit>          # Maximum requests allowed in window
X-RateLimit-Remaining: <remaining>  # Remaining requests in current window
X-RateLimit-Reset: <timestamp>      # Timestamp when limit resets (ms)
```

## Testing Rate Limits

### Test 1: Contact Form (Easiest)

```bash
# Make 4 rapid requests to contact form
for i in {1..4}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test"}' \
    -i | grep -E "(HTTP|x-ratelimit|error)"
  echo "---"
  sleep 1
done
```

**Expected**:
- Requests 1-3: HTTP 200 OK
- Request 4: HTTP 429 Too Many Requests with error: "Too many requests. Please try again in 10 minutes."

### Test 2: Check Headers

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test"}' \
  -v 2>&1 | grep -i ratelimit
```

**Expected output**:
```
< x-ratelimit-limit: 3
< x-ratelimit-remaining: 2
< x-ratelimit-reset: 1719667200000
```

### Test 3: Order Creation (Requires Auth)

```javascript
// In browser console after completing payment
const paymentIntentId = new URLSearchParams(window.location.search).get('payment_intent')
const orderData = sessionStorage.getItem('gpg_pending_order')

// Try to create order 6 times rapidly
for (let i = 0; i < 6; i++) {
  const form = new FormData()
  form.append('paymentIntentId', paymentIntentId)
  form.append('orderData', orderData)
  
  fetch('/api/orders/create', { method: 'POST', body: form })
    .then(r => r.json())
    .then(data => console.log(`Request ${i+1}:`, data))
}
```

**Expected**:
- Requests 1-5: Success or duplicate order (within 15 minute window)
- Request 6+: 429 error with message like "Too many requests. Please try again in 14 minutes."

## Rationale

### Contact Form (3 per 10 minutes)
- **Why strict**: Genuine users send 1-2 messages max
- **Prevents**: Email spam, contact form abuse
- **Allows**: Legitimate follow-up messages with 3+ minutes gap

### Order Creation (5 per 15 minutes)
- **Why strict**: Paying customers rarely retry failed orders rapidly
- **Prevents**: Order spam, duplicate order floods
- **Allows**: Genuine retries after payment issues (1 per 3 minutes average)

### Auth Callback (5 per 10 minutes)
- **Why moderate**: OAuth redirects are legitimate but need protection
- **Prevents**: Brute force token attacks, OAuth abuse
- **Allows**: Multiple OAuth attempts if user has issues (1 per 2 minutes)

### Admin Routes (30 per minute)
- **Why lenient**: Admin needs to work efficiently
- **Prevents**: Runaway scripts, accidental loops
- **Allows**: Bulk status updates, multiple file uploads

## Implementation Details

### Per-IP Tracking

Rate limits are tracked per client IP address:

```typescript
export function getClientIp(request: Request): string {
  // Vercel provides x-forwarded-for and x-real-ip
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  return 'unknown'
}
```

### In-Memory Store

Rate limits are stored in-memory per serverless instance:

- **Pros**: Fast, no database overhead
- **Cons**: Resets when instance cold starts
- **Trade-off**: Acceptable for abuse prevention (rate limits are lenient enough)

### Automatic Cleanup

Old entries are cleaned up every 60 seconds:

```typescript
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 60_000)
```

## Monitoring

### Log Rate Limit Violations

All rate limit violations are logged:

```
[contact] Rate limit exceeded for IP: 1.2.3.4
[orders/create] Rate limit exceeded for IP: 5.6.7.8
```

### Track in Production

Monitor these patterns:
- **High 429 rates**: Possible bot attack or legitimate traffic spike
- **Repeated violations from same IP**: Potential abuse
- **Low remaining counts**: Users hitting limits frequently (may need adjustment)

## Future Improvements

1. **Redis-based tracking**: Share limits across serverless instances
2. **User-based limits**: Track by user ID instead of just IP
3. **Graduated responses**: Exponential backoff for repeated violations
4. **IP whitelisting**: Allow higher limits for known good actors
5. **Geographic limits**: Different limits by region if needed
6. **CAPTCHA on violations**: Show CAPTCHA after N violations instead of hard blocking
