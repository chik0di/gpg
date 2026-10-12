const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript')
const root = path.resolve(__dirname, '..')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename)
const uid = '11111111-1111-4111-8111-111111111111'
let user={id:uid,email:'student@example.com'}, stored, payment, existing, writes=[], mails=[], calls=[], modelCalls=0
let records,files,leaseLost,failAt,providerError,signatureError,rpcCalls
const db={auth:{getUser:async()=>({data:{user}})},storage:{from(){return {
 upload:async()=>({error:failAt==='upload'?{message:'mock failure'}:null}),
 download:async()=>({data:new Blob(['mock PDF'],{type:'application/pdf'}),error:null}),remove:async()=>({error:null})
}}},async rpc(name,args){
 assert.equal(name,'fulfil_paid_order');rpcCalls++
 if(failAt==='deliverables')return {data:null,error:{message:'atomic rollback'}}
 if(!records){records={id:'order-id',...args.p_order,status:'pending',fulfilment_completed_at:null,confirmation_sent_at:null,admin_alert_sent_at:null,checkout_processing_at:null};writes.push({table:'orders',operation:'insert',values:records});writes.push({table:'deliverables',values:args.p_deliverables})}
 return {data:records.id,error:null}
},from(table){let values,operation='read',filters=[]
 const q={select(){return q},eq(k,v){filters.push([k,v]);return q},or(value){filters.push(['or',value]);return q},limit(){return q},
 insert(v){operation='insert';values=v;return q},update(v){operation='update';values=v;return q},
 async execute(){
  calls.push({table,operation,filters})
  if(operation==='update'&&table==='orders'){
   const expected=filters.find(([k])=>k==='checkout_processing_at')
   if(expected&&records.checkout_processing_at!==expected[1])return {data:null,error:null}
   if(values.checkout_processing_at){if(leaseLost||records.checkout_processing_at)return {data:null,error:null}}
   records={...records,...values};writes.push({table,operation,values});return {data:records,error:null}
  }
  if(operation==='insert'&&table==='order_files'){
   if(failAt==='link')return {data:null,error:{message:'mock link failure'}}
   files.push(values);writes.push({table,operation,values});return {data:{id:'file-id'},error:null}
  }
  if(operation==='update'&&table==='pending_orders'){writes.push({table,operation,values,filters});return {data:null,error:null}}
  if(table==='orders')return {data:existing??records,error:null}
  if(table==='order_files')return {data:files,error:null}
  if(table==='pending_orders')return {data:{order_data:stored,user_id:uid,file_data:null,checkout_key:'22222222-2222-4222-8222-222222222222'},error:null}
  if(table==='profiles')return {data:{first_name:'Test',last_name:'Student',email:user.email},error:null}
  return {data:null,error:null}
 },single(){return q.execute()},maybeSingle(){return q.execute()},then(resolve,reject){return q.execute().then(resolve,reject)}};return q}}
const stripe={paymentIntents:{retrieve:async()=>payment},webhooks:{constructEvent:()=>{if(signatureError)throw new Error('bad signature');return {type:'payment_intent.succeeded',data:{object:payment}}}}}
class Anthropic { constructor(){this.messages={create:async()=>{modelCalls++;return {content:[{type:'text',text:JSON.stringify({module_name:'Independent project',subject_area:'Business',academic_level:'Masters',deadline:null,work_scope:'dissertation',scope_reason:'A Masters dissertation',deliverables:[],additional_notes:null})}]}}}} }
const original=Module._load
Module._load=function(name,parent,main){
 if(name==='@/lib/supabase/server')return {createServerClient:()=>db}
 if(name==='@/lib/supabase/admin')return {supabaseAdmin:db}
 if(name==='@supabase/supabase-js')return {createClient:()=>db}
 if(name==='@anthropic-ai/sdk')return Anthropic
 if(name==='@/lib/stripe/server')return {stripe}
 if(name==='@/lib/rate-limit')return {rateLimit:()=>({success:true}),getClientIp:()=> 'mock-ip',RateLimitPresets:{orderCreation:{}},getRateLimitErrorMessage:()=>''}
 if(name==='@/lib/resend')return {sendOrderConfirmation:async data=>{mails.push(data);return {error:providerError?{message:'rejected'}:null}},sendAdminNewOrderAlert:async data=>{mails.push(data);return {error:null}}}
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
const reset=()=>{stored={...normalized,checkoutQuote:quote};payment={id:'pi_mock',status:'succeeded',amount:quote.totalPence,currency:'gbp',created:Date.parse(quote.calculatedAt)/1000,metadata:{userId:uid,pendingOrderId:'pending-id',orderHash:checkoutDigest(stored)}};existing=null;records=null;files=[];leaseLost=false;failAt=null;providerError=false;signatureError=false;rpcCalls=0;writes=[];mails=[];calls=[]}
const request=()=>{const form=new FormData();form.set('paymentIntentId','pi_mock');form.set('orderData',JSON.stringify({...normalized,academicLevel:'Undergraduate'}));return new Request('https://example.com/api/orders/create',{method:'POST',body:form})}
const whRequest=()=>new Request('https://example.com/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':'mock'},body:'mock webhook'})
const briefRequest=name=>{const form=new FormData();form.set('sessionId','session-id');form.set('file',new Blob(['%PDF-mock'],{type:'application/pdf'}),name);return new Request('https://example.com/api/extract-brief',{method:'POST',body:form})}
const log=console.log,warn=console.warn,error=console.error
async function main(){
 console.log=console.warn=console.error=()=>{}
 reset();payment.metadata.userId='other';assert.equal((await create(request())).status,403);assert.equal(writes.length,0)
 reset();payment.currency='usd';assert.equal((await create(request())).status,403)
 reset();stored.instructions='altered after payment';assert.equal((await create(request())).status,503);assert.equal(writes.length,0)
 reset();payment.amount=100;assert.equal((await create(request())).status,503);assert.equal(writes.length,0)
 reset();const response=await create(request());assert.equal(response.status,200,JSON.stringify(await response.clone().json()))
 const order=writes.find(w=>w.table==='orders'&&w.operation==='insert').values
 assert.equal(order.status,'pending');assert.equal(order.academic_level,'Masters');assert.equal(order.total_amount,quote.totalPence/100)
 assert.deepEqual(order.pricing_snapshot,quote)
 assert.deepEqual(writes.find(w=>w.table==='deliverables').values.map(d=>d.price_pence),quote.finalPence)
 assert.equal(mails[0].totalAmount,quote.totalPence/100)
 assert.deepEqual(mails[0].deliverableItems.map(d=>Math.round(d.finalPrice*100)),quote.finalPence)
 const finished=writes.find(w=>w.table==='pending_orders'&&w.values.fulfilled_at)
 assert.equal(finished.values.file_data,null)
 assert.ok(finished.filters.some(([k,v])=>k==='user_id'&&v===uid))
 assert.ok(finished.filters.some(([k,v])=>k==='or'&&v.includes('pending-id')&&v.includes('22222222-2222-4222-8222-222222222222')))
 assert.ok(writes.some(w=>w.table==='order_files'))
 assert.ok(records.fulfilment_completed_at);assert.equal(mails[0].idempotencyKey,'order-confirmation-order-id')
 const prior=writes.length;assert.equal((await create(request())).status,200);assert.equal(writes.length,prior);assert.equal(mails.length,2)
 reset();signatureError=true;assert.equal((await webhook(whRequest())).status,400);assert.equal(writes.length,0)
 reset();assert.equal((await webhook(whRequest())).status,200);assert.equal(records.status,'pending')
 reset();failAt='deliverables';assert.equal((await create(request())).status,503);assert.equal(records,null);assert.equal(mails.length,0)
 for(const fault of ['upload','link']){
  reset();failAt=fault;assert.equal((await webhook(whRequest())).status,503);assert.equal(records.fulfilment_completed_at,null);assert.equal(mails.length,0)
  failAt=null;assert.equal((await webhook(whRequest())).status,200);assert.equal(files.length,1);assert.equal(writes.filter(w=>w.table==='orders'&&w.operation==='insert').length,1)
 }
 reset();providerError=true;assert.equal((await webhook(whRequest())).status,503);assert.ok(records.fulfilment_completed_at);assert.equal(records.confirmation_sent_at,null);assert.ok(records.admin_alert_sent_at)
 providerError=false;assert.equal((await webhook(whRequest())).status,200);assert.equal(mails.length,3);assert.equal(mails[2].idempotencyKey,mails[0].idempotencyKey)
 reset();leaseLost=true;assert.equal((await create(request())).status,202);assert.equal(mails.length,0)
 reset();const concurrent=await Promise.all([create(request()),webhook(whRequest())]);assert.ok([200,202].includes(concurrent[0].status));assert.ok([200,503].includes(concurrent[1].status))
 assert.equal(writes.filter(w=>w.table==='orders'&&w.operation==='insert').length,1);assert.equal(files.length,1);assert.equal(mails.length,2)
 reset();const noSession=new FormData();noSession.set('paymentIntentId','pi_mock');assert.equal((await create(new Request('https://example.com/api/orders/create',{method:'POST',body:noSession}))).status,200)
 reset();payment.status='processing';assert.equal((await create(request())).status,202);assert.equal(writes.length,0)
 reset();payment.status='requires_payment_method';assert.equal((await create(request())).status,402);assert.equal(writes.length,0)
 reset();modelCalls=0
 const named=await extract(briefRequest('Dissertation.pdf'));assert.equal(named.status,422);assert.equal((await named.json()).code,'UNSUPPORTED_WORK');assert.equal(modelCalls,0)
 const classified=await extract(briefRequest('Brief.pdf'));assert.equal(classified.status,422,JSON.stringify(await classified.clone().json()));assert.equal((await classified.json()).code,'UNSUPPORTED_WORK');assert.equal(modelCalls,1)
 console.log=log;console.warn=warn;console.error=error
 console.log('Order fulfilment tests passed: atomic creation, concurrent confirmation, recoverable files, email retries, missing browser storage, payment ownership and dissertation upload rejection. No external services called.')
}
main().catch(err=>{console.log=log;console.warn=warn;console.error=error;console.error(err);process.exitCode=1}).finally(()=>{Module._load=original})
