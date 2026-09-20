/**
 * Test script for Research Finder rate limiting
 *
 * Tests:
 * 1. Spacing limit (3 seconds between requests)
 * 2. Total count limit (20 requests per hour)
 * 3. IP extraction and tracking
 */

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeSearchRequest(topic = 'test query') {
  const response = await fetch('http://localhost:3000/api/resources/research', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Simulate a real IP - in production Vercel adds this automatically
      'x-forwarded-for': '192.168.1.100'
    },
    body: JSON.stringify({ topic })
  })

  const data = await response.json()
  const headers = {
    limit: response.headers.get('x-ratelimit-limit'),
    remaining: response.headers.get('x-ratelimit-remaining'),
    reset: response.headers.get('x-ratelimit-reset')
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
    headers
  }
}

async function checkQuota() {
  const response = await fetch('http://localhost:3000/api/resources/research', {
    headers: {
      'x-forwarded-for': '192.168.1.100'
    }
  })
  return response.json()
}

async function runTests() {
  console.log('🧪 Testing Research Finder Rate Limiting')
  console.log('═'.repeat(60))

  // Test 1: Check initial quota
  console.log('\n📊 Test 1: Initial quota check')
  console.log('─'.repeat(60))
  let quota = await checkQuota()
  console.log('Quota:', quota)
  console.log('✅ Test 1 passed')

  // Test 2: Spacing limit (3 second minimum)
  console.log('\n⏱️  Test 2: Spacing limit (min 3 seconds between requests)')
  console.log('─'.repeat(60))

  const req1 = await makeSearchRequest('machine learning')
  console.log('Request 1:', { status: req1.status, remaining: req1.headers.remaining })

  console.log('Waiting 1 second...')
  await sleep(1000)

  const req2 = await makeSearchRequest('artificial intelligence')
  console.log('Request 2 (should fail - too soon):', {
    status: req2.status,
    error: req2.data.error
  })

  if (req2.status === 429 && req2.data.error.includes('wait')) {
    console.log('✅ Test 2 passed - spacing limit enforced')
  } else {
    console.log('❌ Test 2 failed - spacing limit NOT enforced')
  }

  // Test 3: Successful request after proper spacing
  console.log('\n⏱️  Test 3: Request after proper spacing (3+ seconds)')
  console.log('─'.repeat(60))
  console.log('Waiting 3 seconds...')
  await sleep(3000)

  const req3 = await makeSearchRequest('deep learning')
  console.log('Request 3:', {
    status: req3.status,
    remaining: req3.headers.remaining,
    ok: req3.ok
  })

  if (req3.ok) {
    console.log('✅ Test 3 passed - request allowed after proper spacing')
  } else {
    console.log('❌ Test 3 failed - request blocked incorrectly')
  }

  // Test 4: Quota tracking
  console.log('\n📊 Test 4: Quota tracking accuracy')
  console.log('─'.repeat(60))
  quota = await checkQuota()
  console.log('Current quota:', quota)

  if (quota.used >= 2 && quota.remaining === 20 - quota.used) {
    console.log('✅ Test 4 passed - quota tracking is accurate')
  } else {
    console.log('❌ Test 4 failed - quota tracking mismatch')
  }

  // Test 5: Rapid fire test (only run if you want to hit the count limit)
  const runCountLimitTest = false // Set to true to test the 20-request limit

  if (runCountLimitTest) {
    console.log('\n🔥 Test 5: Count limit (20 requests per hour)')
    console.log('─'.repeat(60))
    console.log('Firing requests with 3-second spacing until limit...')

    let count = quota.used
    const maxRequests = 25 // Try to exceed the limit

    while (count < maxRequests) {
      await sleep(3000)
      const req = await makeSearchRequest(`query ${count}`)
      console.log(`Request ${count + 1}:`, {
        status: req.status,
        remaining: req.headers.remaining,
        error: req.data.error || 'none'
      })

      if (req.status === 429 && req.data.error.includes('limit reached')) {
        console.log(`✅ Test 5 passed - count limit enforced at ${count} requests`)
        break
      }

      count++

      if (count >= maxRequests) {
        console.log('⚠️  Reached max test requests without hitting limit')
      }
    }
  } else {
    console.log('\n⏭️  Test 5: Skipped (count limit test disabled)')
    console.log('   Set runCountLimitTest = true to test the 20-request limit')
  }

  console.log('\n═'.repeat(60))
  console.log('🎉 Testing complete!')
  console.log('\n📝 Summary:')
  const finalQuota = await checkQuota()
  console.log(`   Used: ${finalQuota.used}/${finalQuota.limit}`)
  console.log(`   Remaining: ${finalQuota.remaining}`)
  if (finalQuota.resetAt) {
    console.log(`   Resets at: ${new Date(finalQuota.resetAt).toLocaleTimeString()}`)
  }
}

// Run tests
console.log('⚠️  Make sure your dev server is running: npm run dev')
console.log('⚠️  And the rate_limits table exists in Supabase\n')

runTests().catch(console.error)
