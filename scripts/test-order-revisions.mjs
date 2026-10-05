// Run with an installed PGlite package, or pass its absolute module path:
// node scripts/test-order-revisions.mjs /tmp/gpg-revision-db-test/node_modules/@electric-sql/pglite/dist/index.js
// Uses an isolated in-memory PostgreSQL instance; never reads .env.local.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const engine = process.argv[2]
const { PGlite } = await import(engine ? pathToFileURL(engine).href : '@electric-sql/pglite')
const db = new PGlite()
let checks = 0
const owner = '00000000-0000-0000-0000-000000000001'
const other = '00000000-0000-0000-0000-000000000002'
const admin = '00000000-0000-0000-0000-000000000003'
const order = '00000000-0000-0000-0000-000000000010'
const oldOrder = '00000000-0000-0000-0000-000000000011'
const pendingOrder = '00000000-0000-0000-0000-000000000012'

async function rejects(sql, args, pattern) {
  await assert.rejects(db.query(sql, args), pattern)
  checks++
}
async function request(id = order, user = owner, instructions = 'Please correct the references on page 2.') {
  return (await db.query('select * from request_order_revision($1,$2,$3)', [id, user, instructions])).rows[0]
}
async function action(id, status, response = null, path = null, actor = admin, isAdmin = true, orderId = order) {
  return (await db.query('select * from update_order_revision($1,$2,$3,$4,$5,$6,$7)', [orderId, id, actor, isAdmin, status, response, path])).rows[0]
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user_id', true), '')::uuid$$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table public.orders(id uuid primary key, user_id uuid references auth.users(id), status text);
    create table public.profiles(id uuid primary key references auth.users(id), is_admin boolean default false);
    create table public.order_files(id uuid primary key default gen_random_uuid(), order_id uuid references orders(id), file_type text, file_url text, created_at timestamptz default now());
    grant select on orders to authenticated;
    alter table orders enable row level security;
    create policy own_orders on orders for select to authenticated using(user_id = auth.uid());
    insert into auth.users values ('${owner}', 'client@example.test'), ('${other}', 'other@example.test'), ('${admin}', 'admin@getprimegrade.com');
    insert into profiles values ('${owner}', false), ('${other}', false), ('${admin}', true);
    insert into orders values ('${order}', '${owner}', 'pending'), ('${oldOrder}', '${owner}', 'completed'), ('${pendingOrder}', '${owner}', 'pending');
    insert into order_files(order_id, file_type, file_url, created_at) values ('${oldOrder}', 'completed', 'legacy.pdf', now() - interval '15 days');
  `)
  await db.exec(await readFile(new URL('../supabase/migrations/023_order_revisions.sql', import.meta.url), 'utf8'))
  await db.exec('grant all on orders, order_files, profiles to service_role; set role service_role')
  checks++
  await rejects("update orders set status = 'completed' where id = $1", [pendingOrder], /Upload completed work/)
  await assert.rejects(request(pendingOrder), /after your work is delivered/); checks++
  await assert.rejects(request(oldOrder), /window has closed/); checks++
  await db.query("insert into order_files(order_id, file_type, file_url) values ($1, 'completed', 'original.pdf')", [order])
  await db.query("update orders set status = 'completed' where id = $1", [order])
  const firstDelivery = (await db.query('select first_delivered_at from orders where id = $1', [order])).rows[0].first_delivered_at
  assert.ok(firstDelivery); checks++
  await db.query("update orders set first_delivered_at = now() + interval '30 days' where id = $1", [order])
  assert.equal(String((await db.query('select first_delivered_at from orders where id = $1', [order])).rows[0].first_delivered_at), String(firstDelivery)); checks++
  await assert.rejects(request(order, other), /Order not found/); checks++
  await assert.rejects(request(order, owner, 'short'), /check constraint/); checks++

  const results = await Promise.allSettled([request(), request()])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); checks++
  const initial = results.find(r => r.status === 'fulfilled').value
  await action(initial.id, 'cancelled', null, null, owner, false)
  const declined = await request()
  await assert.rejects(action(declined.id, 'declined'), /check constraint/); checks++
  await action(declined.id, 'declined', 'This request introduces a new topic outside the original brief.')
  assert.equal((await db.query("select count(*)::int n from order_revisions where status = 'delivered'")).rows[0].n, 0); checks++

  for (let round = 1; round <= 3; round++) {
    const revision = await request()
    await assert.rejects(action(revision.id, 'in_progress', null, null, other, true), /Forbidden/); checks++
    await assert.rejects(action(revision.id, 'delivered', null, 'revision.pdf'), /Start the revision/); checks++
    await action(revision.id, 'in_progress')
    await assert.rejects(action(revision.id, 'cancelled', null, null, owner, false), /not started/); checks++
    await assert.rejects(action(revision.id, 'delivered'), /Upload revised work/); checks++
    await action(revision.id, 'delivered', 'Updated the references.', `revision-${round}.pdf`)
    await assert.rejects(action(revision.id, 'delivered', null, 'duplicate.pdf'), /Start the revision/); checks++
  }
  await assert.rejects(request(), /three free revisions/); checks++
  assert.equal((await db.query('select count(*)::int n from order_files where order_id = $1', [order])).rows[0].n, 4); checks++

  // A timely request can be finished after the original window expires.
  const lateId = '00000000-0000-0000-0000-000000000013'
  await db.query("insert into orders(id,user_id,status,first_delivered_at) values ($1,$2,'completed',now()-interval '13 days')", [lateId, owner])
  const timely = await request(lateId)
  // Simulate elapsed time in this test database only.
  await db.exec('reset role; alter table orders disable trigger record_first_order_delivery')
  await db.query("update orders set first_delivered_at = now()-interval '15 days' where id=$1", [lateId])
  await db.exec('alter table orders enable trigger record_first_order_delivery; set role service_role')
  await action(timely.id, 'in_progress', null, null, admin, true, lateId)
  await action(timely.id, 'delivered', null, 'late-delivery.pdf', admin, true, lateId)
  await assert.rejects(request(lateId), /window has closed/); checks++

  // Ownership policies and RPC permissions hold for direct database clients.
  await db.exec(`reset role; set role authenticated; set test.user_id = '${other}'`)
  assert.equal((await db.query('select * from order_revisions')).rows.length, 0); checks++
  await assert.rejects(request(order), /permission denied/); checks++
  await rejects("insert into order_revisions(order_id,instructions) values ($1,'Try to bypass the API')", [order], /permission denied/)
  await db.exec(`set test.user_id = '${owner}'`)
  assert.ok((await db.query('select * from order_revisions')).rows.length > 0); checks++
  await db.exec('reset role; set role anon')
  await rejects('select * from order_revisions', [], /permission denied/)
  await db.exec('reset role')

  const source = await readFile(new URL('../lib/revisions.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const { revisionEligibility } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  const now = Date.now()
  const deliveredAt = new Date(now - 86400000).toISOString()
  assert.equal(revisionEligibility(deliveredAt, 'completed', [], now).remaining, 3); checks++
  assert.equal(revisionEligibility(deliveredAt, 'completed', [{ status: 'declined' }, { status: 'cancelled' }], now).remaining, 3); checks++
  assert.ok(revisionEligibility(deliveredAt, 'completed', [{ status: 'requested' }], now).reason); checks++
  assert.ok(revisionEligibility(new Date(now - 14 * 86400000).toISOString(), 'completed', [], now).reason); checks++
  assert.equal(revisionEligibility(deliveredAt, 'completed', Array.from({ length: 3 }, () => ({ status: 'delivered' })), now).remaining, 0); checks++
  console.log(`Passed ${checks} checks: migration, ownership, allowance, duplicate submissions, transitions, expiry, version history and UI eligibility.`)
} finally {
  await db.close()
}
