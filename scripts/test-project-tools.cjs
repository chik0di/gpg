const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
const { suggestTasks, projectToolsSchema, emptyProjectTools, matrixCsv, outlineText } = require('../lib/project-tools.ts')
const uid = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222', pid = '33333333-3333-4333-8333-333333333333', sid = '44444444-4444-4444-8444-444444444444', id = '55555555-5555-4555-8555-555555555555'
let seq = 0
const makeId = () => `${String(++seq).padStart(8, '0')}-1111-4111-8111-111111111111`
for (const [today, deadline] of [['2026-10-08', '2026-10-31'], ['2026-12-31','2027-01-01'], ['2028-02-28','2028-03-01'], ['2026-10-08','2026-10-08']]) {
 const tasks = suggestTasks(deadline, today, makeId)
 assert.equal(tasks.length,6); assert.equal(tasks[0].due_date,today); assert.equal(tasks.at(-1).due_date,deadline)
 assert.ok(tasks.every((t,i) => t.due_date >= today && t.due_date <= deadline && (!i || tasks[i-1].due_date <= t.due_date)))
 assert.equal(projectToolsSchema.safeParse({ ...emptyProjectTools,tasks }).success,true)
}
for (const deadline of [null,'2026-10-07','invalid']) assert.ok(suggestTasks(deadline,'2026-10-08',makeId).every(t=>t.due_date===null))
assert.throws(()=>suggestTasks(null,'invalid',makeId))
const task = {id,title:'Research',due_date:'2026-10-09',completed:false}
assert.equal(projectToolsSchema.safeParse({...emptyProjectTools,tasks:[task,{...task}]}).success,false)
assert.equal(projectToolsSchema.safeParse({...emptyProjectTools,tasks:[{...task,due_date:'2027-02-29'}]}).success,false)
assert.equal(projectToolsSchema.safeParse({...emptyProjectTools,tasks:[{...task,title:''}]}).success,false)
assert.equal(projectToolsSchema.safeParse({...emptyProjectTools,outline:[{id,heading:'Analysis',word_budget:-1,notes:'',source_ids:[]}]}).success,false)
const row = {id,source_id:sid,source_title:'Paper',question:'Question?',methods:'Interviews',findings:'=HYPERLINK("bad")',limitations:'Small sample',relevance:'Supports theory'}
const plan = {...emptyProjectTools,matrix:[row],outline:[{id,heading:'Analysis',word_budget:500,notes:'Compare evidence.',source_ids:[sid]}],word_target:1000}
assert.match(matrixCsv(plan),/'=HYPERLINK\(""bad""\)/)
assert.match(outlineText(plan,'Report'),/1\. Analysis \(500 words\)/)
let user={id:uid}, owner=uid, existing=null, sourceExists=true, writeError=null, loseRace=false, lastWrite, calls=[]
const db={auth:{getUser:async()=>({data:{user}})},from(table){let filters=[],operation='read',values
 const q={select(){return q},eq(k,v){filters.push([k,v]);return q},in(k,v){filters.push([k,v]);return q},insert(v){operation='insert';values=v;return q},update(v){operation='update';values=v;return q},
 async execute(single){calls.push({table,filters,operation})
  if(table==='study_projects')return {data:owner===user.id?{id:pid}:null,error:null}
  if(table==='saved_research_sources')return {data:sourceExists?[{id:sid}]:[],error:null}
  if(operation==='read')return {data:existing,error:null}
  lastWrite={values,filters,operation}
  if(writeError)return {data:null,error:{code:writeError}}
  if(loseRace)return {data:null,error:null}
  existing={content:values.content,updated_at:'2026-10-08T12:00:00Z'}
  return {data:existing,error:null}
 },maybeSingle(){return q.execute(true)},then(resolve,reject){return q.execute(false).then(resolve,reject)}};return q}}
const original=Module._load
Module._load=function(name,parent,main){if(name==='@/lib/supabase/server')return {createServerClient:()=>db};if(name.startsWith('@/'))return original.call(this,path.join(root,name.slice(2)),parent,main);return original.call(this,name,parent,main)}
const api=require('../app/api/workspace/projects/[id]/tools/route.ts')
const req=(method,body)=>new Request('https://example.com/api/workspace/projects/'+pid+'/tools',{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
const ctx={params:{id:pid}}
async function main(){
 user=null;assert.equal((await api.GET(req('GET'),ctx)).status,401);assert.equal((await api.PUT(req('PUT',{content:plan,version:null}),ctx)).status,401)
 user={id:uid};owner=other;assert.equal((await api.GET(req('GET'),ctx)).status,404);assert.equal((await api.PUT(req('PUT',{content:plan,version:null}),ctx)).status,404);owner=uid
 const empty=await api.GET(req('GET'),ctx);assert.equal(empty.headers.get('cache-control'),'private, no-store');assert.deepEqual((await empty.json()).content,emptyProjectTools)
 assert.equal((await api.PUT(req('PUT',{content:plan,version:null,user_id:other}),ctx)).status,200);assert.equal(lastWrite.values.user_id,uid)
 assert.ok(calls.filter(c=>c.operation==='read').every(c=>c.filters.some(([k,v])=>k==='user_id'&&v===uid)))
 assert.equal((await api.PUT(req('PUT',{content:plan,version:null}),ctx)).status,409)
 const version=existing.updated_at
 assert.equal((await api.PUT(req('PUT',{content:{...plan,matrix:[{...row,source_id:other}]},version}),ctx)).status,400)
 sourceExists=false
 assert.equal((await api.PUT(req('PUT',{content:plan,version}),ctx)).status,200)
 assert.equal(existing.content.matrix[0].source_id,null);assert.equal(existing.content.matrix[0].findings,row.findings);assert.deepEqual(existing.content.outline[0].source_ids,[])
 assert.ok(lastWrite.filters.some(([k,v])=>k==='updated_at'&&v===version));assert.ok(lastWrite.filters.some(([k,v])=>k==='user_id'&&v===uid))
 loseRace=true;assert.equal((await api.PUT(req('PUT',{content:emptyProjectTools,version:existing.updated_at}),ctx)).status,409);loseRace=false
 existing=null;writeError='23505';assert.equal((await api.PUT(req('PUT',{content:emptyProjectTools,version:null}),ctx)).status,409)
 console.log('Project tools checks passed: short/no/past deadlines, calendar boundaries, validation, CSV safety, account ownership, foreign-source rejection, preserved comparison notes, and concurrent-save protection.')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>Module._load=original)
