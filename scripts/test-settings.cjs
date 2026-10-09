const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const uid='11111111-1111-4111-8111-111111111111'
let user,change,sends,claims,writes,allow,providerError,tableError,claimLost
const db={auth:{getUser:async()=>({data:{user},error:null})},from(table){let operation='read',values,filters=[]
 const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},or(v){filters.push(['or',v]);return q},order(){return q},limit(){return q},update(v){operation='update';values=v;return q},async execute(){
  if(table==='profiles')return {data:{first_name:'Test'},error:null}
  if(tableError)return {data:null,error:{message:'Unavailable'}}
  if(operation==='read')return {data:change?.new_email===user.email?change:null,error:null}
  writes.push({values,filters})
  assert.ok(filters.some(([k,v])=>k==='user_id'&&v===uid),'Every write must be owned')
  if(values.notification_claimed_at&&filters.some(([k])=>k==='or')) {
   if(claimLost)return {data:null,error:null}
   claims++;return {data:{id:change.id},error:null}
  }
  return {data:null,error:null}
 },maybeSingle(){return q.execute()},then(resolve,reject){return q.execute().then(resolve,reject)}};return q}}
const original=Module._load
Module._load=function(name,parent,main){
 if(name==='@/lib/supabase/server')return {createServerClient:()=>db}
 if(name==='@/lib/supabase/admin')return {supabaseAdmin:db}
 if(name==='@/lib/rate-limit')return {rateLimit:()=>({success:allow})}
 if(name==='@/lib/resend')return {sendEmailChangeSecurityNotification:async data=>{sends.push(data);return {data:providerError?null:{id:'mock'},error:providerError?{message:'rejected'}:null}}}
 if(name.startsWith('@/'))return original.call(this,path.join(root,name.slice(2)),parent,main)
 return original.call(this,name,parent,main)
}
const {POST}=require('../app/api/auth/email-change-notification/route.ts')
const reset=()=>{user={id:uid,email:'verified-new@example.com'};change={id:'change-id',old_email:'verified-old@example.com',new_email:user.email,created_at:new Date().toISOString(),notification_sent_at:null};sends=[];claims=0;writes=[];allow=true;providerError=false;tableError=false;claimLost=false}
const req=()=>new Request('https://example.com/api/auth/email-change-notification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oldEmail:'unrelated@example.com',newEmail:'forged@example.com'})})
async function main(){
 reset();user=null;assert.equal((await POST(req())).status,401);assert.equal(sends.length,0)
 reset();change=null;assert.deepEqual(await (await POST(req())).json(),{changed:false});assert.equal(sends.length,0)
 reset();change.new_email='unconfirmed@example.com';assert.equal((await POST(req())).status,200);assert.equal(sends.length,0)
 reset();const response=await POST(req());assert.equal(response.status,200);assert.deepEqual(await response.json(),{changed:true})
 assert.equal(sends.length,1);assert.equal(sends[0].to,'verified-old@example.com');assert.equal(sends[0].newEmail,'verified-new@example.com');assert.equal(sends[0].idempotencyKey,'account-email-change-change-id')
 assert.ok(writes.some(w=>w.values.notification_sent_at))
 reset();change.notification_sent_at=new Date().toISOString();assert.equal((await POST(req())).status,200);assert.equal(sends.length,0)
 reset();claimLost=true;assert.equal((await POST(req())).status,200);assert.equal(sends.length,0)
 reset();allow=false;assert.equal((await POST(req())).status,429);assert.equal(sends.length,0)
 reset();providerError=true;assert.equal((await POST(req())).status,500);assert.ok(writes.some(w=>w.values.notification_claimed_at===null))
 reset();tableError=true;assert.equal((await POST(req())).status,503);assert.equal(sends.length,0)
 reset();change.created_at='2020-01-01T00:00:00Z';assert.deepEqual(await (await POST(req())).json(),{changed:false})
 console.log('Settings API checks passed: verified changes, no arbitrary recipients, account ownership, duplicate protection, retries and provider errors. No emails sent.')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>Module._load=original)
