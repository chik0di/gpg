const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
const { savedSourceSchema } = require('../lib/validations/saved-source.ts')
const { researchSourceKey } = require('../lib/saved-sources.ts')
const { NextRequest } = require('next/server')
const sample = { title: 'Learning research', authors: 'Ada Smith', year: 2024, url: 'https://example.com/paper', doi: '10.1000/ABC', hasFreeAccess: true, pdfUrl: 'https://example.com/paper.pdf' }
assert.equal(researchSourceKey(sample), 'doi:10.1000/abc')
assert.equal(researchSourceKey({ url: 'https://doi.org/10.1000/ABC' }), 'doi:10.1000/abc')
assert.equal(researchSourceKey({ url: 'https://example.com/paper#section' }), 'url:https://example.com/paper')
assert.equal(savedSourceSchema.safeParse({ ...sample, pdfUrl: 'javascript:alert(1)' }).success, false)
assert.equal(savedSourceSchema.safeParse({ ...sample, year: 99999 }).success, false)
assert.equal(savedSourceSchema.safeParse({ ...sample, user_id: 'attacker' }).data.user_id, undefined)

let user = { id: '11111111-1111-4111-8111-111111111111' }, records = [], lastWrite, operations = []
const client = {
  auth: { getUser: async () => ({ data: { user } }) },
  from(table) {
    assert.equal(table, 'saved_research_sources')
    const filters = [], query = {
      select() { return query }, eq(field, value) { filters.push([field, value]); operations.push([field, value]); return query },
      order() { return query }, range() { return query },
      upsert(row, options) { lastWrite = row; assert.equal(options.onConflict, 'user_id,source_key'); return query },
      single: async () => ({ data: { id: '22222222-2222-4222-8222-222222222222', ...lastWrite }, error: null }),
      delete() { return query },
      then(resolve) { return Promise.resolve({ data: records, error: null }).then(resolve) },
    }
    return query
  },
}
const originalLoad = Module._load
Module._load = function (name, parent, main) {
  if (name === '@/lib/supabase/server') return { createServerClient: () => client }
  if (name.startsWith('@/')) return originalLoad.call(this, path.join(root, name.slice(2)), parent, main)
  return originalLoad.call(this, name, parent, main)
}
const api = require('../app/api/saved-sources/route.ts')
const remove = require('../app/api/saved-sources/[id]/route.ts')
const request = (method, data, suffix = '') => new NextRequest('https://example.com/api/saved-sources' + suffix, { method, ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}) })

async function main() {
  user = null
  assert.equal((await api.GET(request('GET'))).status, 401)
  assert.equal((await api.POST(request('POST', sample))).status, 401)
  assert.equal((await remove.DELETE(request('DELETE'), { params: { id: '22222222-2222-4222-8222-222222222222' } })).status, 401)
  user = { id: '11111111-1111-4111-8111-111111111111' }
  assert.equal((await api.POST(request('POST', { ...sample, url: 'javascript:alert(1)' }))).status, 400)
  const saved = await api.POST(request('POST', { ...sample, source: 'OpenAlex', user_id: 'some-other-user' }))
  assert.equal(saved.status, 200); assert.equal(lastWrite.user_id, user.id); assert.equal(lastWrite.source_key, 'doi:10.1000/abc')
  assert.equal(lastWrite.source_data.user_id, undefined)
  records = [{ id: '22222222-2222-4222-8222-222222222222', source_data: sample, source_key: 'doi:10.1000/abc', created_at: new Date().toISOString() }, { source_data: { ...sample, url: 'javascript:alert(1)' } }]
  const list = await api.GET(request('GET'))
  assert.equal((await list.json()).sources.length, 1); assert.equal(list.headers.get('cache-control'), 'private, no-store')
  assert.ok(operations.some(([field, value]) => field === 'user_id' && value === user.id))
  operations = []
  assert.equal((await remove.DELETE(request('DELETE'), { params: { id: '22222222-2222-4222-8222-222222222222' } })).status, 200)
  assert.deepEqual(operations, [['id', '22222222-2222-4222-8222-222222222222'], ['user_id', user.id]])
  assert.equal((await remove.DELETE(request('DELETE'), { params: { id: 'invalid' } })).status, 400)
  console.log('Saved source checks passed: identifier deduplication, input/link validation, sign-in requirements, account-scoped writes and deletes, safe list responses.')
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => { Module._load = originalLoad })
