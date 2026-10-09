const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
let user = { id: '11111111-1111-4111-8111-111111111111', email: 'student@example.com' }, pending, stripeCalls = [], dbCalls = [], allowRate = true
const db = { auth: { getUser: async () => ({ data: { user } }) }, from(table) { const q = {
 insert(value) { pending = value; dbCalls.push({ table, value }); return q }, select() { return q },
 single: async () => ({ data: { id: 'pending-id' }, error: null }), delete() { return q }, eq() { return Promise.resolve({ error: null }) }
}; return q } }
const stripe = { paymentIntents: { create: async options => { stripeCalls.push(options); return { client_secret: 'mock-secret', amount: options.amount } } } }
const original = Module._load
Module._load = function(name, parent, main) {
 if(name === '@/lib/supabase/server') return { createServerClient: () => db }
 if(name === '@/lib/supabase/admin') return { supabaseAdmin: db }
 if(name === '@/lib/stripe/server') return { stripe }
 if(name === '@/lib/rate-limit') return { rateLimit: () => ({ success: allowRate }) }
 if(name.startsWith('@/')) return original.call(this, path.join(root, name.slice(2)), parent, main)
 return original.call(this, name, parent, main)
}
const { calculateOrderQuote, checkoutOrderSchema, assertCheckoutDeadline } = require('../lib/order-quote.ts')
const { checkoutDigest, verifyPaidCheckout } = require('../lib/checkout-integrity.ts')
const { assertAssignmentScope, hasUnsupportedWorkTitle } = require('../lib/order-scope.ts')
const { ClaudeExtractionSchema } = require('../lib/extraction-validation.ts')
const { POST } = require('../app/api/stripe/create-payment-intent/route.ts')
const now = Date.parse('2026-10-09T12:00:00Z')
const written = { id: 'written', type: 'written', sizeMode: 'words', quantity: 551, basePrice: 0.01 }
const slides = { id: 'slides', type: 'presentation', slideCount: 3, slideInputMode: 'exact', basePrice: 999999 }
const practical = { id: 'practical', type: 'practical', practicalKey: 'security', basePrice: 1 }
const data = { subjectField: 'Computer Science', academicLevel: 'Masters', deadline: '2026-10-18', deliverables: [written, slides, practical], includeOriginalityReport: true, workScope: 'assignment', usedAIExtraction: true, briefTempPath: 'briefs/temp/brief.pdf', briefFileName: 'brief.pdf' }
const normalized = checkoutOrderSchema.parse(data)
const quote = calculateOrderQuote(normalized, now)
assert.deepEqual(quote.basePence, [1500, 750, 13000])
assert.deepEqual(quote.finalPence, [2340, 1170, 20280])
assert.equal(quote.totalPence, 24590)
assert.equal(quote.totalPence, quote.finalPence.reduce((s,v)=>s+v,0) + quote.reportPence)
for(const [days,pct] of [[14,100],[13,120],[7,120],[6,150],[4,150],[3,180]]) {
 const deadline = new Date(now + days * 86400000).toISOString().slice(0,10)
 assert.equal(calculateOrderQuote({ ...normalized, deadline }, now).deadlinePct, pct)
}
for(const bad of [
 {...data,academicLevel:'PhD'}, {...data,deadline:'2026-02-30'}, {...data,deliverables:[]},
 {...data,deliverables:[{...written,quantity:-1}]}, {...data,deliverables:[{...written,quantity:1.5}]},
 {...data,deliverables:[{...slides,slideCount:61}]}, {...data,deliverables:[{...slides,slideInputMode:'between',slideMin:10,slideMax:5}]},
 {...data,deliverables:[{...practical,practicalKey:'toString'}]}, {...data,deliverables:[{...written,type:'unknown'}]},
]) assert.equal(checkoutOrderSchema.safeParse(bad).success,false)
assert.throws(()=>assertCheckoutDeadline('2026-10-10',now))
assert.doesNotThrow(()=>assertCheckoutDeadline('2026-10-11',now))
for(const title of ['My dissertation.docx','MSc_thesis.pdf','Dissertation chapter 2','Research dissertation proposal','Chapter of my thesis']) assert.equal(hasUnsupportedWorkTitle(title),true,title)
for(const title of ['Literature review for the marketing module','Essay about dissertation supervision','Research methods report']) assert.equal(hasUnsupportedWorkTitle(title),false,title)
for(const scope of ['dissertation','thesis']) assert.throws(()=>assertAssignmentScope({...data,workScope:scope}))
assert.doesNotThrow(()=>assertAssignmentScope(data))
assert.doesNotThrow(()=>assertAssignmentScope({...data,instructions:'Discuss a dissertation as an example in this standalone essay.'}))
const extraction={module_name:null,subject_area:null,academic_level:'Masters',deadline:null,deliverables:[],additional_notes:null,work_scope:'dissertation'}
assert.equal(ClaudeExtractionSchema.safeParse(extraction).success,true)
const stored = {...normalized,checkoutQuote:quote}
const pi = { amount: quote.totalPence, currency:'gbp', created:now/1000, metadata:{userId:user.id,orderHash:checkoutDigest(stored)} }
assert.deepEqual(verifyPaidCheckout(pi,JSON.parse(JSON.stringify(stored)),user.id).quote,quote)
assert.equal(checkoutDigest(stored),checkoutDigest(Object.fromEntries(Object.entries(stored).reverse())))
assert.throws(()=>verifyPaidCheckout(pi,{...stored,academicLevel:'Undergraduate'},user.id))
assert.throws(()=>verifyPaidCheckout(pi,stored,'other'))
assert.throws(()=>verifyPaidCheckout({...pi,currency:'usd'},stored,user.id))
assert.throws(()=>verifyPaidCheckout({...pi,amount:100},stored,user.id))
// Fulfilment must preserve the accepted price after the deadline tier has changed.
assert.notEqual(calculateOrderQuote(normalized,now+3*86400000).totalPence,quote.totalPence)
assert.equal(verifyPaidCheckout(pi,stored,user.id).quote.totalPence,quote.totalPence)
assert.equal(verifyPaidCheckout({...pi,metadata:{userId:user.id}},normalized,user.id).quote.totalPence,quote.totalPence)
const request = body => new Request('https://example.com/api/stripe/create-payment-intent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
async function main() {
 user=null;assert.equal((await POST(request({}))).status,401)
 user={id:pi.metadata.userId,email:'student@example.com'}
 const future = {...data,deadline:new Date(Date.now()+20*86400000).toISOString().slice(0,10)}
 const amountPence=calculateOrderQuote(checkoutOrderSchema.parse(future)).totalPence
 for(const [input,status] of [
  [{orderData:future,amountPence:100},409],
  [{orderData:future,amountPence:100.5},400],
  [{orderData:{...future,workScope:'dissertation'},amountPence},400],
  [{orderData:{...future,briefFileName:'Dissertation.pdf'},amountPence},400],
  [{orderData:{...future,academicLevel:'PhD'},amountPence},400],
  [{orderData:{...future,deadline:'2020-01-01'},amountPence},400],
 ]) assert.equal((await POST(request(input))).status,status)
 assert.equal(stripeCalls.length,0);assert.equal(dbCalls.length,0)
 const response=await POST(request({orderData:{...future,checkoutQuote:{totalPence:1}},amountPence,fileData:null}))
 assert.equal(response.status,200)
 const result=await response.json();assert.equal(result.amountPence,amountPence)
 assert.equal(stripeCalls[0].amount,amountPence)
 assert.equal(pending.user_id,user.id)
 assert.equal(pending.order_data.briefTempPath,future.briefTempPath)
 assert.equal(stripeCalls[0].metadata.orderHash,checkoutDigest(pending.order_data))
 allowRate=false;assert.equal((await POST(request({orderData:future,amountPence}))).status,429)
 console.log('Checkout tests passed: server pricing, input validation, assignment scope, payment ownership, immutable quotes and pre-payment rejection.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{Module._load=original})
