# Rate Limiting Changes - Summary

## Overview

Updated rate limiting across the application to be **stricter and more realistic** for actual human usage patterns, with **user-friendly error messages** that tell users exactly when they can try again.

---

## Changes Made

### 1. Updated Rate Limit Presets (`lib/rate-limit.ts`)

**Before (Generic/Loose)**:
```typescript
export const RateLimitPresets = {
  strict: { limit: 5, windowSeconds: 60 },      // 5/min
  moderate: { limit: 10, windowSeconds: 60 },   // 10/min
  relaxed: { limit: 30, windowSeconds: 60 },    // 30/min
}
```

**After (Human-Calibrated/Strict)**:
```typescript
export const RateLimitPresets = {
  contactForm: { limit: 3, windowSeconds: 600 },    // 3 per 10 minutes
  orderCreation: { limit: 5, windowSeconds: 900 },  // 5 per 15 minutes
  auth: { limit: 5, windowSeconds: 600 },           // 5 per 10 minutes
  admin: { limit: 30, windowSeconds: 60 },          // 30 per minute
}
```

### 2. Added User-Friendly Error Messages

**New function in `lib/rate-limit.ts`**:
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

**Example messages**:
- "Too many requests. Please try again in 45 seconds."
- "Too many requests. Please try again in 8 minutes."

### 3. Updated Contact Form (`app/api/contact/route.ts`)

**Changes**:
- ❌ Removed: `RateLimitPresets.moderate` (10/min)
- ✅ Added: `RateLimitPresets.contactForm` (3 per 10 min)
- ✅ Added: User-friendly error message with countdown
- ✅ Added: Rate limit headers in response

**Before**:
```typescript
const rateLimitResult = rateLimit(clientIp, RateLimitPresets.moderate)

if (!rateLimitResult.success) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  )
}
```

**After**:
```typescript
const rateLimitResult = rateLimit(clientIp, RateLimitPresets.contactForm)

if (!rateLimitResult.success) {
  return NextResponse.json(
    { error: getRateLimitErrorMessage(rateLimitResult.resetAt) },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetAt),
      }
    }
  )
}
```

### 4. Updated Order Creation (`app/api/orders/create/route.ts`)

**Changes**:
- ❌ Removed: `RateLimitPresets.strict` (5/min)
- ✅ Added: `RateLimitPresets.orderCreation` (5 per 15 min)
- ✅ Added: User-friendly error message with countdown
- ✅ Already had: Rate limit headers in response

**Impact**: Order retries now limited to 1 per 3 minutes on average

### 5. Updated Admin Routes

**Files updated**:
- `app/api/admin/orders/[id]/status/route.ts`
- `app/api/admin/orders/[id]/upload/route.ts`

**Changes**:
- ❌ Removed: `RateLimitPresets.relaxed` (30/min) - generic name
- ✅ Added: `RateLimitPresets.admin` (30/min) - specific name
- ✅ Added: User-friendly error messages
- ✅ Added: Rate limit headers

### 6. Added Auth Callback Rate Limiting (`app/api/auth/callback/route.ts`)

**New addition**: OAuth callback now has rate limiting to prevent abuse

```typescript
const rateLimitResult = rateLimit(clientIp, RateLimitPresets.auth)

if (!rateLimitResult.success) {
  return NextResponse.redirect(`${origin}/login?error=rate_limit`)
}
```

**Impact**: Prevents OAuth token brute force attempts (5 per 10 minutes)

---

## Rate Limit Comparison

| Endpoint | Before | After | Change |
|----------|--------|-------|--------|
| Contact Form | 10 per 1 min | **3 per 10 min** | ✅ **30x stricter** |
| Order Creation | 5 per 1 min | **5 per 15 min** | ✅ **15x stricter** |
| Auth Callback | None | **5 per 10 min** | ✅ **New protection** |
| Admin Status | 30 per 1 min | 30 per 1 min | ⚫ Same |
| Admin Upload | 30 per 1 min | 30 per 1 min | ⚫ Same |

---

## Rationale for Each Limit

### Contact Form: 3 per 10 minutes
**Why**:
- Genuine person sends 1-2 messages max
- Multiple submissions usually indicate spam/bots
- 10 minute window allows follow-up questions

**Prevents**:
- Email spam floods
- Contact form abuse
- Bot submissions

**Allows**:
- Initial submission
- 1-2 legitimate retries if user makes error
- Follow-up message after ~3 minutes

### Order Creation: 5 per 15 minutes
**Why**:
- Paying customers rarely retry failed orders rapidly
- Payment issues usually require waiting/fixing payment method
- 15 minute window prevents accidental duplicate orders

**Prevents**:
- Order spam
- Duplicate order floods
- Payment system abuse

**Allows**:
- Initial order attempt
- 4 retries if payment fails (1 per 3 minutes average)
- Sufficient for legitimate payment issues

### Auth Callback: 5 per 10 minutes
**Why**:
- OAuth redirects are legitimate but need protection
- Users rarely retry auth more than 2-3 times
- Prevents brute force token attacks

**Prevents**:
- OAuth token brute forcing
- Auth callback abuse
- Automated auth attempts

**Allows**:
- Initial OAuth redirect
- 4 retries for auth issues (1 per 2 minutes average)
- Multiple sign-in attempts if user has issues

### Admin Routes: 30 per minute
**Why**:
- Admin needs efficiency for bulk operations
- Still prevents runaway scripts
- 30/min allows rapid status updates

**Prevents**:
- Accidental infinite loops
- Runaway scripts
- Database hammering

**Allows**:
- Bulk order status updates
- Multiple file uploads
- Efficient admin workflow

---

## User Experience Improvements

### Before (Generic)
```
HTTP 429
{
  "error": "Too many requests. Please try again later."
}
```

**Problems**:
- ❌ No indication of when to retry
- ❌ User doesn't know how long to wait
- ❌ Generic message doesn't help

### After (Specific)
```
HTTP 429
{
  "error": "Too many requests. Please try again in 8 minutes."
}

Headers:
  X-RateLimit-Limit: 3
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1719667200000
```

**Benefits**:
- ✅ User knows exactly when to retry
- ✅ Clear countdown (seconds or minutes)
- ✅ Headers allow client-side countdown timers
- ✅ Better UX - less frustration

---

## Testing the Changes

### Quick Test - Contact Form
```bash
# Try 4 submissions rapidly
for i in {1..4}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test"}' \
    -i | grep -E "(HTTP|error)"
  sleep 1
done
```

**Expected**:
```
Request 1: HTTP/1.1 200 OK
Request 2: HTTP/1.1 200 OK
Request 3: HTTP/1.1 200 OK
Request 4: HTTP/1.1 429 Too Many Requests
          "error": "Too many requests. Please try again in 10 minutes."
```

### Check Rate Limit Headers
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test"}' \
  -v 2>&1 | grep -i ratelimit
```

**Expected**:
```
< x-ratelimit-limit: 3
< x-ratelimit-remaining: 2
< x-ratelimit-reset: 1719667200000
```

---

## Documentation

Created comprehensive documentation:
- **RATE_LIMITING_GUIDE.md** - Full guide with examples, tests, and rationale

---

## Build Status

✅ **Build succeeded** - All TypeScript types valid, no errors

---

## Security Benefits

1. **Contact Form Spam Prevention**
   - 30x stricter limit prevents email floods
   - Protects inbox from bot spam

2. **Order Creation Protection**
   - 15x stricter limit prevents payment abuse
   - Reduces risk of duplicate order charges

3. **Auth Brute Force Prevention**
   - New rate limit on OAuth callback
   - Prevents token brute force attacks

4. **Admin Protection**
   - Prevents accidental database hammering
   - Protects against runaway admin scripts

---

## Backward Compatibility

✅ **Fully backward compatible**:
- Old preset names removed but not used elsewhere
- New presets are drop-in replacements
- All existing rate limit logic preserved
- Same return structure and headers

---

## Next Steps

1. ✅ Deploy to production
2. 📊 Monitor 429 error rates
3. 👀 Watch for legitimate users hitting limits
4. 🔧 Adjust if needed based on real usage data

---

## Monitoring Recommendations

Track these metrics in production:

- **429 rate by endpoint**: Which endpoints hit limits most?
- **User complaints**: Any legitimate users blocked?
- **Retry patterns**: How often do users retry after 429?
- **Attack mitigation**: Reduction in spam/abuse attempts

If legitimate users frequently hit limits, consider:
- Increasing limits slightly
- Adding CAPTCHA instead of hard blocking
- Implementing exponential backoff
