const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
const { projectSchema, sourceNotesSchema, bibliographySchema, bibliographyDraftSchema } = require('../lib/workspace.ts')
const uid = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222', pid = '33333333-3333-4333-8333-333333333333', bid = '44444444-4444-4444-8444-444444444444', sid = '55555555-5555-4555-8555-555555555555'
const book = { type: 'book', authors: ['Smith, Ada'], title: 'Research', year: '2024', publisher: 'Example', place: 'London' }
const project = { title: 'Report', module: 'Management', deadline: '2028-02-29', requirements: 'Discuss evidence.' }
const bibliography = { title: 'References', project_id: pid, style: 'APA', sources: [book] }
assert.equal(projectSchema.safeParse(project).success, true)
for (const deadline of ['2027-02-29', '2026-99-99', '2026-01-00', 'bad']) assert.equal(projectSchema.safeParse({ ...project, deadline }).success, false)
assert.equal(projectSchema.parse({ ...project, deadline: '' }).deadline, null)
assert.equal(bibliographySchema.safeParse({ ...bibliography, sources: [] }).success, false)
assert.equal(bibliographyDraftSchema.safeParse({ ...bibliography, sources: [] }).success, true)
assert.equal(bibliographySchema.safeParse({ ...bibliography, sources: Array(201).fill(book) }).success, false)
assert.equal(bibliographySchema.safeParse({ ...bibliography, sources: [{ type: 'website', title: 'Bad', organisation: 'X', year: '', dateAccessed: '2026-01-01', url: 'javascript:alert(1)' }] }).success, false)
assert.deepEqual(sourceNotesSchema.parse({ project_id: null, reading_status: 'read', tags: [' theory ', 'theory'], notes: 'Own thoughts', quotation: 'Exact words', page_numbers: '12' }).tags, ['theory'])
assert.equal(sourceNotesSchema.safeParse({ project_id: null, reading_status: 'bad', tags: [], notes: '', quotation: '', page_numbers: '' }).success, false)
let user = { id: uid }, dbError = false, writes = [], reads = [], rows = {
 study_projects: [{ ...project, id: pid, user_id: uid }, { ...project, id: other, user_id: other }],
 saved_bibliographies: [{ ...bibliography, id: bid, user_id: uid, updated_at: '2026-10-08T10:00:00.000Z' }],
 saved_research_sources: [{ id: sid, user_id: uid, source_key: 'url:https://example.com/', source_data: { title: 'Paper', authors: 'Ada', year: 2024, url: 'https://example.com/', hasFreeAccess: false }, notes: 'Keep this', project_id: null }],
}
const client = {
 auth: { getUser: async () => ({ data: { user } }) },
 from(table) {
   let filters = [], operation = 'read', values, range
   const q = {
     select() { return q }, eq(k,v) { filters.push([k,v]); return q }, is(k,v) { filters.push([k,v]); return q }, order() { return q }, range(a,b) { range = [a,b]; return q },
     insert(v) { values=v; operation='insert'; return q }, update(v) { values=v; operation='update'; return q }, delete() { operation='delete'; return q },
     upsert(v) { values=v; operation='upsert'; return q },
     async execute(single) {
       reads.push({ table, filters, operation })
       if (dbError) return { data: null, error: { code: 'XX' } }
       let found = rows[table].filter(row => filters.every(([k,v]) => row[k] === v))
       if (operation === 'insert') { const row = { ...values, id: '66666666-6666-4666-8666-666666666666', updated_at: '2026-10-08T11:00:00.000Z' }; rows[table].push(row); found = [row] }
       if (operation === 'update') found.forEach(row => Object.assign(row, values, { updated_at: '2026-10-08T11:00:00.000Z' }))
       if (operation === 'upsert') {
         let row = rows[table].find(r => r.user_id === values.user_id && r.source_key === values.source_key)
         if (row) Object.assign(row, values); else { row = { ...values, id: sid }; rows[table].push(row) }
         found = [row]
       }
       if (operation !== 'read') writes.push({ table, values, filters, affected: found.length })
       if (operation === 'delete') rows[table] = rows[table].filter(row => !found.includes(row))
       if (range) found = found.slice(range[0], range[1] + 1)
       return { data: single ? found[0] || null : found, error: null }
     },
     maybeSingle() { return q.execute(true) }, single() { return q.execute(true) }, then(resolve,reject) { return q.execute(false).then(resolve,reject) },
   }
   return q
 },
}
const originalLoad = Module._load
Module._load = function (name,parent,main) {
 if (name === '@/lib/supabase/server') return { createServerClient: () => client }
 if (name.startsWith('@/')) return originalLoad.call(this,path.join(root,name.slice(2)),parent,main)
 return originalLoad.call(this,name,parent,main)
}
const p = require('../app/api/workspace/projects/route.ts'), pi = require('../app/api/workspace/projects/[id]/route.ts'), b = require('../app/api/workspace/bibliographies/route.ts'), bi = require('../app/api/workspace/bibliographies/[id]/route.ts'), sources = require('../app/api/saved-sources/route.ts'), note = require('../app/api/saved-sources/[id]/route.ts')
const { NextRequest } = require('next/server')
const req = (method,body,url='https://example.com/api/workspace',headers={}) => new NextRequest(url,{ method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
const ctx = id => ({ params: { id } })
async function main() {
 user = null
 for (const api of [p,b]) { assert.equal((await api.GET(req('GET'))).status,401); assert.equal((await api.POST(req('POST',{}))).status,401) }
 assert.equal((await bi.PATCH(req('PATCH',bibliography),ctx(bid))).status,401)
 assert.equal((await note.PATCH(req('PATCH',{}),ctx(sid))).status,401)
 user = { id: uid }
 assert.equal((await p.POST(req('POST',{ ...project, user_id: other }))).status,200)
 assert.equal(writes.at(-1).values.user_id,uid)
 const listed = await p.GET(req('GET')); assert.equal(listed.headers.get('cache-control'),'private, no-store'); assert.equal((await listed.json()).items.some(r => r.user_id === other),false)
 assert.equal((await pi.GET(req('GET'),ctx(other))).status,404)
 assert.equal((await pi.PATCH(req('PATCH',project),ctx(other))).status,404)
 assert.equal((await pi.DELETE(req('DELETE'),ctx(other))).status,404)
 assert.equal((await b.POST(req('POST',{ ...bibliography, project_id: other }))).status,400)
 assert.equal((await b.POST(req('POST',{ ...bibliography, user_id: other }))).status,200); assert.equal(writes.at(-1).values.user_id,uid)
 assert.equal((await bi.PATCH(req('PATCH',bibliography),ctx(bid))).status,400)
 assert.equal((await bi.PATCH(req('PATCH',bibliography,undefined,{ 'If-Unmodified-Since': '2026-10-08T09:00:00.000Z' }),ctx(bid))).status,409)
 assert.equal((await bi.PATCH(req('PATCH',{ ...bibliography, title: 'Updated' },undefined,{ 'If-Unmodified-Since': '2026-10-08T10:00:00.000Z' }),ctx(bid))).status,200)
 assert.ok(writes.at(-1).filters.some(([k,v]) => k === 'user_id' && v === uid))
 const notes = { project_id: pid, reading_status: 'reading', tags: ['Methods'], notes: 'My thoughts', quotation: 'Quoted text', page_numbers: 'p. 3' }
 assert.equal((await note.PATCH(req('PATCH',{ ...notes, project_id: other }),ctx(sid))).status,400)
 assert.equal((await note.PATCH(req('PATCH',{ ...notes, user_id: other }),ctx(sid))).status,200)
 assert.equal(writes.at(-1).values.user_id,undefined)
 assert.ok(writes.at(-1).filters.some(([k,v]) => k === 'user_id' && v === uid))
 const sample = rows.saved_research_sources[0].source_data
 assert.equal((await sources.POST(req('POST',{ source: { ...sample, source: 'OpenAlex' }, project_id: pid }))).status,200)
 assert.equal(rows.saved_research_sources[0].notes,'My thoughts')
 assert.equal((await sources.POST(req('POST',{ source: sample, project_id: other }))).status,400)
 assert.equal((await sources.GET(req('GET',undefined,`https://example.com/api/saved-sources?project=${pid}`))).status,200)
 assert.ok(reads.at(-1).filters.some(([k,v]) => k === 'project_id' && v === pid))
 dbError = true; assert.equal((await p.GET(req('GET'))).status,500)
 console.log('Workspace checks passed: dates and citation validation, authentication, owner isolation, foreign project rejection, notes preserved on saves, project filters, bibliography conflict detection and error responses.')
}
main().catch(error => { console.error(error); process.exitCode=1 }).finally(() => { Module._load=originalLoad })
