const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),ts=require('typescript')
const root=path.resolve(__dirname,'..')
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f)
const {Packer}=require('docx'),JSZip=require('jszip'),mammoth=require('mammoth')
const {bibliographyDocument}=require('../lib/bibliography-export.ts'),{formatBibliography,citationPlainText}=require('../lib/citation-formatter.ts')
const {searchBooks,bookEditions,lookupBook}=require('../lib/open-library.ts')
const book={type:'book',authors:['Smith, John Michael'],title:'Research & science',year:'2024',publisher:'Academic Press',place:'London',edition:'2nd'}
const journal={type:'journal',authors:['Jones, Ada'],title:'Research',year:'2023',journalName:'Journal of Research',volume:'5',pageRange:'10-20'}
const web={type:'website',organisation:'Example Institute',title:'Research',year:'2022',url:'https://example.com',dateAccessed:'15 September 2024'}
let allowed=true,limits=[]
const originalLoad=Module._load
Module._load=function(name,parent,main){
 if(name==='@/lib/resource-rate-limit')return{checkRateLimit:async(ip,options)=>{limits.push({ip,options});return{allowed,error:'Please try again later.'}},getClientIP:()=> '127.0.0.1'}
 if(name.startsWith('@/'))return originalLoad.call(this,path.join(root,name.slice(2)),parent,main)
 return originalLoad.call(this,name,parent,main)
}
const exportApi=require('../app/api/resources/bibliography/route.ts'),booksApi=require('../app/api/resources/books/route.ts'),{NextRequest}=require('next/server')
const originalFetch=global.fetch
async function main(){
 for(const style of ['APA','Harvard','Vancouver','MLA','Chicago']){
  const sources=[book,journal,web],buffer=await Packer.toBuffer(bibliographyDocument(sources,style)),zip=await JSZip.loadAsync(buffer)
  const xml=await zip.file('word/document.xml').async('string')
  assert.match(xml,/w:hanging="720"/);assert.match(xml,/w:left="720"/);assert.match(await zip.file('word/styles.xml').async('string'),/w:line="480"/)
  if(style!=='Vancouver')assert.match(xml,/<w:i\/>/)
  assert.match(xml,/Research &amp; science/)
  const text=(await mammoth.extractRawText({buffer})).value
  const refs=formatBibliography(sources,style)
  for(const ref of refs)assert.ok(text.includes(citationPlainText(ref)),style+': '+citationPlainText(ref))
  assert.ok(text.indexOf(citationPlainText(refs[0]))<text.indexOf(citationPlainText(refs[1])))
 }
 const request=body=>new NextRequest('https://example.com/api/resources/bibliography',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
 const response=await exportApi.POST(request({style:'APA',sources:[book]}))
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/wordprocessingml/);assert.match(response.headers.get('content-disposition'),/\.docx/)
 assert.equal((await exportApi.POST(request({style:'APA',sources:[]}))).status,400)
 assert.equal((await exportApi.POST(request({style:'APA',sources:[{...web,url:'javascript:alert(1)'}]}))).status,400)
 allowed=false;assert.equal((await exportApi.POST(request({style:'APA',sources:[book]}))).status,429);allowed=true
 let urls=[]
 global.fetch=async url=>{
  urls.push(String(url));const value=String(url)
  if(value.includes('/search.json'))return Response.json({numFound:11,docs:[{key:'/works/OL1W',title:'Research',author_name:['Ada Smith'],first_publish_year:1980,edition_count:4}]})
  if(value.includes('/editions.json'))return Response.json({size:21,entries:[{key:'/books/OL1M',title:'Research',publish_date:'2001',publishers:['First Press'],isbn_13:['9780140328721'],edition_name:'2nd ed.',languages:[{key:'/languages/eng'}]},{key:'/books/OL2M',title:'Research',publish_date:'2010',publishers:['Later Press']}]})
  if(value.endsWith('/books/OL2M.json'))return Response.json({key:'/books/OL2M',title:'Research',publish_date:'2010',publishers:['Later Press'],works:[{key:'/works/OL1W'}]})
  if(value.endsWith('/works/OL1W.json'))return Response.json({authors:[{author:{key:'/authors/OL1A'}}]})
  if(value.endsWith('/authors/OL1A.json'))return Response.json({name:'Ada Smith'})
  throw new Error('Unexpected URL: '+value)
 }
 const search=await searchBooks('Research','Ada Smith')
 assert.equal(search.books.length,1);assert.equal(search.hasMore,true);assert.match(urls[0],/title=Research&/);assert.match(urls[0],/author=Ada\+Smith/)
 const editions=await bookEditions('/works/OL1W')
 assert.equal(editions.editions.length,2);assert.equal(editions.hasMore,true);assert.equal(editions.editions[1].date,'2010')
 const selected=await lookupBook('/books/OL2M')
 assert.equal(selected.year,'2010');assert.equal(selected.publisher,'Later Press');assert.deepEqual(selected.authors,['Ada Smith'])
 await assert.rejects(bookEditions('/works/../../private'),/Invalid/);await assert.rejects(lookupBook('https://localhost'),/Invalid/)
 const before=urls.length;await lookupBook('/books/OL2M');assert.equal(urls.length,before,'Repeated edition lookup should use cached metadata')
 const good=await booksApi.GET(new NextRequest('https://example.com/api/resources/books?title=Research&author=Ada%20Smith'))
 assert.equal(good.status,200);assert.equal(limits.at(-1).options.count,120)
 assert.equal((await booksApi.GET(new NextRequest('https://example.com/api/resources/books?edition=https://localhost'))).status,400)
 console.log('Reference tools checks passed: real DOCX structure, italics, hanging indents, all five styles, export validation, book matches, edition pagination, selected edition metadata, author fallback, caching, identifier restrictions.')
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{Module._load=originalLoad;global.fetch=originalFetch})
