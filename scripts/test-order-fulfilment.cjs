const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename)
const uid = '11111111-1111-4111-8111-111111111111'
let user={id:uid,email:'student@example.com'}, stored, payment, existing=null, writes=[], mails=[], calls=[], modelCalls=0
const db={auth:{getUser:async()=>({data:{user}})},storage:{from(){return {upload:async()=>({error:null}),download:async()=>({data:new Blob(['mock PDF'],{type:'application/pdf'}),error:null}),remove:async()=>({error:null})}}},from(table){let values,operation='read',filters=[]
 const q={select(){return q},eq(k,v){filters.push([k,v]);return q},insert(v){operation='insert';values=v;return q},update(v){operation='update';values=v;return q},delete(){operation='delete';return q},async execute(){
  calls.push({table,operation,filters})
  if(operation!=='read'){writes.push({table,operation,values,filters});return {data:{id:'order-id'},error:null}}
  if(table==='orders')return {data:existing,error:null}
  if(table==='pending_orders')return {data:{order_data:stored,user_id:uid,file_data:null},error:null}
  if(table==='profiles')return {data:{first_name:'Test',last_name:'Student',email:user.email},error:null}
  return {data:null,error:null}
 },single(){return q.execute()},maybeSingle(){return q.execute()},then(resolve,reject){return q.execute().then(resolve,reject)}};return q}}
const stripe={paymentIntents:{retrieve:async()=>payment},webhooks:{constructEvent:()=>({type:'payment_intent.succeeded',data:{object:payment}})}}
class Anthropic { constructor(){this.messages={create:async()=>{modelCalls++;return {content:[{type:'text',text:JSON.stringify({module_name:'Independent project',subject_area:'Business',academic_level:'Masters',deadline:null,work_scope:'dissertation',scope_reason:'A Masters dissertation',deliverables:[],additional_notes:null})}]}}}} }
const original=Module._load
Module._load=function(name,parent,main){
 if(name==='@/lib/supabase/server')return {createServerClient:()=>db}
 if(name==='@/lib/supabase/admin')return {supabaseAdmin:db}
 if(name==='@supabase/supabase-js')return {createClient:()=>db}
 if(name==='@anthropic-ai/sdk')return Anthropic
 if(name==='@/lib/stripe/server')return {stripe}
 if(name==='@/lib/rate-limit')return {rateLimit:()=>({success:true}),getClientIp:()=> 'mock-ip',RateLimitPresets:{orderCreation:{}},getRateLimitErrorMessage:()=>''}
 if(name==='@/lib/resend')return {sendOrderConfirmation:async data=>{mails.push(data)},sendAdminNewOrderAlert:async data=>{mails.push(data)}}
 if(name.startsWith('@/'))return original.call(this,path.join(root,name.slice(2)),parent,main)
 return original.call(this,name,parent,main)
}
const {checkoutOrderSchema,calculateOrderQuote}=require('../lib/order-quote.ts')
const {checkoutDigest}=require('../lib/checkout-integrity.ts')
const create=require('../app/api/orders/create/route.ts').POST
const webhook=require('../app/api/stripe/webhook/route.ts').POST
const extract=require('../app/api/extract-brief/route.ts').POST
const normalized=checkoutOrderSchema.parse({subjectField:'Business Administration',academicLevel:'Masters',deadline:'2026-10-18',deliverables:[{id:'slides',type:'presentation',slideCount:3,slideInputMode:'exact'},{id:'practical',type:'practical',practicalKey:'security'}],instructions:'Taught-module report',includeOriginalityReport:true,workScope:'assignment',usedAIExtraction:true,briefTempPath:'briefs/temp/brief.pdf',briefFileName:'brief.pdf'})
const quote=calculateOrderQuote(normalized,Date.parse('2026-10-09T12:00:00Z'))
const reset=()=>{stored={...normalized,checkoutQuote:quote};payment={id:'pi_mock',status:'succeeded',amount:quote.totalPence,currency:'gbp',created:Date.parse(quote.calculatedAt)/1000,metadata:{userId:uid,pendingOrderId:'pending-id',orderHash:checkoutDigest(stored)}};existing=null;writes=[];mails=[];calls=[]}
const request=()=>{const form=new FormData();form.set('paymentIntentId','pi_mock');form.set('orderData',JSON.stringify({...normalized,academicLevel:'Undergraduate'}));return new Request('https://example.com/api/orders/create',{method:'POST',body:form})}
const whRequest=()=>new Request('https://example.com/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'mock'},body:'mock webhook'})
const briefRequest=name=>{const form=new FormData();form.set('sessionId','session-id');form.set('file',new Blob(['%PDF-mock'],{type:'application/pdf'}),name);return new Request('https://example.com/api/extract-brief',{method:'POST',body:form})}
const log=console.log,warn=console.warn,error=console.error
async function main(){
 console.log=console.warn=console.error=()=>{}
 reset();payment.metadata.userId='other';assert.equal((await create(request())).status,403);assert.equal(writes.length,0)
 reset();payment.currency='usd';assert.equal((await create(request())).status,403)
 reset();stored.instructions='altered after payment';assert.equal((await create(request())).status,400);assert.equal(writes.length,0)
 reset();payment.amount=100;assert.equal((await create(request())).status,400);assert.equal(writes.length,0)
 reset();const response=await create(request());assert.equal(response.status,201,JSON.stringify(await response.clone().json()))
 const order=writes.find(w=>w.table==='orders'&&w.operation==='insert').values
 assert.equal(order.academic_level,'Masters');assert.equal(order.total_amount,quote.totalPence/100)
 assert.deepEqual(order.pricing_snapshot,quote)
 const deliveries=writes.find(w=>w.table==='deliverables').values
 assert.deepEqual(deliveries.map(d=>d.price_pence),quote.finalPence)
 assert.equal(mails[0].totalAmount,quote.totalPence/100)
 assert.deepEqual(mails[0].deliverableItems.map(d=>Math.round(d.finalPrice*100)),quote.finalPence)
 const cleanup=writes.find(w=>w.table==='pending_orders'&&w.operation==='delete')
 assert.ok(cleanup.filters.some(([k,v])=>k==='id'&&v==='pending-id'))
 assert.ok(writes.some(w=>w.table==='order_files'&&w.values.file_type==='assignment'))
 reset();existing={id:'existing-order',status:'completed'};assert.equal((await create(request())).status,200);assert.equal(writes.length,0)
 reset();assert.equal((await webhook(whRequest())).status,200)
 const recovered=writes.find(w=>w.table==='orders'&&w.operation==='insert').values
 assert.equal(recovered.total_amount,quote.totalPence/100);assert.deepEqual(recovered.pricing_snapshot,quote)
 assert.deepEqual(writes.find(w=>w.table==='deliverables').values.map(d=>d.price_pence),quote.finalPence)
 assert.ok(writes.some(w=>w.table==='order_files'&&typeof w.values.file_url==='string'))
 assert.deepEqual(mails[0].deliverableItems.map(d=>Math.round(d.finalPrice*100)),quote.finalPence)
 reset();stored.deadline='2026-10-19';assert.equal((await webhook(whRequest())).status,500);assert.equal(writes.length,0)
 reset();existing={id:'existing-order',status:'completed'};assert.equal((await webhook(whRequest())).status,200);assert.equal(writes.length,0)
 reset();modelCalls=0
 const named=await extract(briefRequest('Dissertation.pdf'));assert.equal(named.status,422);assert.equal((await named.json()).code,'UNSUPPORTED_WORK');assert.equal(modelCalls,0)
 const classified=await extract(briefRequest('Brief.pdf'));assert.equal(classified.status,422,JSON.stringify(await classified.clone().json()));assert.equal((await classified.json()).code,'UNSUPPORTED_WORK');assert.equal(modelCalls,1)
 console.log=log;console.warn=warn;console.error=error
 console.log('Order fulfilment tests passed: signed quote recovery, matching receipts, payment ownership, webhook recovery, scoped cleanup and dissertation upload rejection. No external services called.')
}
main().catch(err=>{console.log=log;console.warn=warn;console.error=error;console.error(err);process.exitCode=1}).finally(()=>{Module._load=original})
