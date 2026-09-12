import {readFileSync,writeFileSync} from 'node:fs';
import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api.js';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim()]}));
const client=new ConvexHttpClient(env.VITE_CONVEX_URL);
const login=await client.action(api.auth.signIn,{provider:'password',params:{username:'admin',password:'123',flow:'signIn'}});client.setAuth(login.tokens.token);
const organizations=await client.query(api.organizations.list,{});
const state={organizationId:organizations[0]._id};
const knownJobs=await client.query(api.jobs.list,{organizationId:state.organizationId});
const knownCard=knownJobs.find(job=>job.requestId==='initial-card-generation-v1');
if(knownCard){state.cardJobId=knownCard._id;state.productId=knownCard.productId;}
if(process.argv.includes('--recover')&&state.cardJobId){await client.mutation(api.jobs.retry,{organizationId:state.organizationId,jobId:state.cardJobId});console.log('Recovering completed Dify result without a new generation.');}
const jobs=await client.query(api.jobs.list,{organizationId:state.organizationId});
console.log('Jobs:',jobs.map(j=>({id:j._id,kind:j.kind,status:j.status,error:j.error})));
const products=await client.query(api.catalog.products,{organizationId:state.organizationId,paginationOpts:{numItems:100,cursor:null}});
const categories=await client.query(api.catalog.categories,{organizationId:state.organizationId});
console.log('Products:',products.page.length,'Categories:',categories.length,'Complete page:',products.isDone);
if(process.argv.includes('--generate')&&products.page.length){
 const product=products.page.find(p=>/Kara/i.test(p.name))??products.page[0];
 const photo=readFileSync('../resources/c-1562004473-3635391617.jpg');
 await client.action(api.files.upload,{organizationId:state.organizationId,kind:'table',name:'restaurant-table.jpg',contentType:'image/jpeg',bytes:photo.buffer.slice(photo.byteOffset,photo.byteOffset+photo.byteLength)});
 state.productId=product._id;
 state.cardJobId=await client.mutation(api.jobs.generateCard,{organizationId:state.organizationId,productId:product._id,requestId:'initial-card-generation-v1',imagePrompt:'Square restaurant menu card. Keep the dish centered; use the saved table as the surface reference.'});
 console.log('Card generation queued for:',product.name);writeFileSync('backend-smoke.local',JSON.stringify(state,null,2));
}
if(state.productId){const product=await client.query(api.catalog.product,{organizationId:state.organizationId,productId:state.productId});console.log('Card:',product.card?{status:product.card.status,hasStoredImage:!!product.card.imageFileId,warnings:product.card.warnings}:null);}
