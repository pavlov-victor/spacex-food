// Live dev integration test; creates a separate demo organization and menu.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i=l.indexOf('='); return [l.slice(0,i),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]; }));
const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
const publicClient = new ConvexHttpClient(env.VITE_CONVEX_URL);
const state = { startedAt: new Date().toISOString() };
mkdirSync('../tmp',{recursive:true});
function save() { writeFileSync('../tmp/demo-flow-result.json', JSON.stringify(state,null,2)); }
async function wait(jobId) {
 let last;
 for(let i=0;i<120;i++) {
  const job = await client.query(api.jobs.get,{organizationId:state.organizationId,jobId});
  if(job.status!==last) {console.log(job.kind,job.status);last=job.status;}
  if(['succeeded','partial','failed'].includes(job.status)) return job;
  await new Promise(r=>setTimeout(r,5000));
 }
 throw new Error('Job timed out; inspect saved job IDs before retrying.');
}
async function upload(name,kind) {
 const b=readFileSync('../resources/'+name);
 return client.action(api.files.upload,{organizationId:state.organizationId,kind,name,contentType:'image/jpeg',bytes:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)});
}
try {
 const auth=await client.action(api.auth.signIn,{provider:'password',params:{username:'admin',password:'123',flow:'signIn'}});
 if(!auth.tokens?.token)throw new Error('No login session');
 client.setAuth(auth.tokens.token);
 state.organizationId=await client.mutation(api.organizations.create,{name:'Integration demo '+Date.now()}); save();
 const menuFile=await upload('r855-Kuvana-jela-A-Blok-Savada-menu-3637114712.jpg','menu');
 state.menuJobId=await client.mutation(api.jobs.importMenu,{organizationId:state.organizationId,name:'Demo photo menu',fileIds:[menuFile],requestId:crypto.randomUUID()});save();
 const menuJob=await wait(state.menuJobId); if(menuJob.status!=='succeeded')throw new Error('Menu import did not succeed');
 const products=await client.query(api.catalog.products,{organizationId:state.organizationId,paginationOpts:{numItems:100,cursor:null}});
 state.productCount=products.page.length;
 const product=products.page.find(p=>/Kara/i.test(p.name))??products.page[0];
 state.productId=product._id;state.menuId=product.menuId;
 await upload('c-1562004473-3635391617.jpg','table');
 const dishFileId=await upload('Karaoreva-nicla-example.jpg','dish');
 state.cardJobId=await client.mutation(api.jobs.generateCard,{organizationId:state.organizationId,productId:state.productId,dishFileId,requestId:crypto.randomUUID(),imagePrompt:'Keep the actual dish appearance. English title only unless restaurant properties were explicitly confirmed.'});save();
 const job=await wait(state.cardJobId);state.cardJobStatus=job.status;state.workflowRunId=job.workflowRunId;save();
 const cardProduct=await client.query(api.catalog.product,{organizationId:state.organizationId,productId:state.productId});
 if(!cardProduct.card)throw new Error('No generated card');
 const draft=JSON.parse(cardProduct.card.draftJson);
 state.workflowVersion=draft.workflow_version;state.imageProvider=draft.product?.image?.provider;state.hasStoredImage=!!cardProduct.card.imageFileId;save();
 if(!state.hasStoredImage)throw new Error('Generated image was not persisted');
 await client.mutation(api.catalog.applyCard,{organizationId:state.organizationId,productId:state.productId,cardId:cardProduct.card._id,reviewed:true});
 // This is a clearly named integration-test menu, not a real restaurant publication.
 state.slug='integration-demo-'+Date.now();
 await client.mutation(api.storefront.publish,{menuId:state.menuId,slug:state.slug,name:'Integration test · sample menu',reviewed:true});
 const menu=await publicClient.query(api.storefront.menu,{slug:state.slug});
 const english=draft.product.translations.en;
 const item=menu.items.find(p=>p.name===english.name);
 if(!item || item.description!==english.description || !item.imageUrl)throw new Error('Published copy/image mismatch');
 const image=await fetch(item.imageUrl);if(!image.ok)throw new Error('Stored image inaccessible');
 writeFileSync('../tmp/demo-flow-image.jpg',Buffer.from(await image.arrayBuffer()));
 state.publishedEnglishCopy=true;state.publicReadWithoutLogin=true;state.finishedAt=new Date().toISOString();save();
 console.log(JSON.stringify(state,null,2));
 if(state.workflowVersion!=='0.0.8') {console.log('VERSION MISMATCH: publish 0.0.8 in Dify.');process.exitCode=2;}
} catch(e) {state.error=e instanceof Error?e.message:'Test failed';save();console.log('Test stopped:',state.error);process.exitCode=1;}
