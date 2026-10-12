const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
let admin, order, activeRevision, updateError, lostUpdate, emailError, emailThrows, sends, updates
const db = {
  auth: { getUser: async () => ({ data: { user: admin ? { email: 'admin@getprimegrade.com' } : null } }) },
  from(table) {
    let write = false
    const filters = []
    const q = {
      select() { return q }, eq(k, v) { filters.push([k, v]); return q }, in() { return q },
      update() { write = true; return q },
      async maybeSingle() {
        if (table === 'order_revisions') return { data: activeRevision ? { id: 'revision' } : null, error: null }
        if (write) {
          updates++
          assert.ok(filters.some(([k, v]) => k === 'status' && v === order.status), 'Status writes compare the previous status')
          return { data: lostUpdate || updateError ? null : { id: 'order' }, error: updateError }
        }
        return { data: order, error: null }
      },
      async single() { return { data: { email: 'client@example.com', first_name: 'Client' }, error: null } },
    }
    return q
  },
}
const original = Module._load
Module._load = function(name, parent, main) {
  if (name === '@/lib/supabase/server') return { createServerClient: () => db }
  if (name === '@/lib/supabase/admin') return { supabaseAdmin: db }
  if (name === '@/lib/rate-limit') return { rateLimit: () => ({ success: true }), getClientIp: () => 'mock', RateLimitPresets: { admin: {} } }
  if (name === '@/lib/utils/request-origin') return { getOriginFromRequest: () => 'https://example.com' }
  if (name === '@/lib/resend') {
    const send = async () => { sends++; if (emailThrows) throw new Error('Mock failure'); return { error: emailError ? { message: 'Mock rejection' } : null } }
    return { sendOrderCompletedEmail: send, sendOrderInProgressEmail: send }
  }
  if (name.startsWith('@/')) return original.call(this, path.join(root, name.slice(2)), parent, main)
  return original.call(this, name, parent, main)
}
const { PATCH } = require('../app/api/admin/orders/[id]/status/route.ts')
const { filterAdminOrders, needsAttention } = require('../lib/admin-order-queue.ts')
function reset() {
  admin = true; order = { status: 'pending', user_id: 'client', subject_field: 'Business', module_name: 'Strategy', deadline: '2030-01-01' }
  activeRevision = false; updateError = null; lostUpdate = false; emailError = false; emailThrows = false; sends = 0; updates = 0
}
const call = status => PATCH(new Request('https://example.com/api/admin/orders/order/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }), { params: { id: 'order' } })
async function main() {
  reset(); admin = false; assert.equal((await call('completed')).status, 403); assert.equal(updates, 0)
  reset(); order = null; assert.equal((await call('completed')).status, 404)
  reset(); assert.equal((await call('invalid')).status, 400)
  reset(); assert.equal((await call('pending')).status, 200); assert.equal(updates, 0); assert.equal(sends, 0)
  reset(); order.status = 'completed'; assert.equal((await call('in_progress')).status, 409); assert.equal(updates, 0)
  reset(); activeRevision = true; assert.equal((await call('completed')).status, 409); assert.equal(updates, 0)
  reset(); updateError = { message: 'Upload completed work before marking the order completed' }; assert.equal((await call('completed')).status, 409); assert.equal(sends, 0)
  reset(); lostUpdate = true; assert.equal((await call('completed')).status, 409); assert.equal(sends, 0)
  reset(); assert.equal((await (await call('completed')).json()).notification, 'sent'); assert.equal(sends, 1)
  for (const mode of ['emailError', 'emailThrows']) {
    reset(); if (mode === 'emailError') emailError = true; else emailThrows = true
    const res = await call('completed'); assert.equal(res.status, 200)
    const result = await res.json(); assert.equal(result.notification, 'failed'); assert.ok(result.warning); assert.equal(updates, 1)
  }
  const now = Date.now(), deadline = hours => new Date(now + hours * 3600000).toISOString()
  const base = { id: '1', status: 'pending', subject_field: 'Business', module_name: 'Strategy', academic_level: 'Masters', deadline: deadline(12), created_at: deadline(-24), total_amount: 10, user_id: 'client' }
  const orders = [base, { ...base, id: '2', deadline: deadline(-12) }, { ...base, id: '3', status: 'completed', has_active_revision: true, deadline: deadline(-100) }, { ...base, id: '4', status: 'completed', deadline: deadline(-100) }]
  const defaults = { timeRange: 'all', status: 'active', urgency: 'all', academicLevel: 'all', subject: 'all', sortBy: 'newest', search: '' }
  assert.deepEqual(filterAdminOrders(orders, defaults).map(o => o.id), ['1', '2', '3'])
  assert.deepEqual(filterAdminOrders(orders, { ...defaults, status: 'all', urgency: 'urgent' }).map(o => o.id), ['1'])
  assert.deepEqual(filterAdminOrders(orders, { ...defaults, urgency: 'overdue' }).map(o => o.id), ['2'])
  assert.deepEqual(filterAdminOrders(orders, { ...defaults, status: 'revisions' }).map(o => o.id), ['3'])
  assert.equal(filterAdminOrders(orders, { ...defaults, search: 'strategy' }).length, 3)
  assert.equal(filterAdminOrders(orders, { ...defaults, search: 'absent' }).filter(needsAttention).length, 0)
  assert.deepEqual(orders.filter(needsAttention).map(o => o.id), ['1', '2', '3'])
  console.log('Admin order checks passed: queue filters, overdue orders, revision visibility, status transitions, concurrent saves and email failure reporting. No live orders or emails used.')
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => { Module._load = original })
