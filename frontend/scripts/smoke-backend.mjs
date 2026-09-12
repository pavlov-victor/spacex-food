import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim()]}));
const client=new ConvexHttpClient(env.VITE_CONVEX_URL);
const login=await client.action(api.auth.signIn,{provider:'password',params:{username:'admin',password:'123',flow:'signIn'}});
if(!login.tokens?.token)throw new Error('Login did not return a session.');
client.setAuth(login.tokens.token);
const orgs=await client.query(api.organizations.list,{});
console.log('Authenticated. Organizations:',orgs.map(o=>o.name));
const org=orgs[0];
const state={organizationId:org._id};
if(process.argv.includes('--import')){
 const photo=readFileSync('../resources/r855-Kuvana-jela-A-Blok-Savada-menu-3637114712.jpg');
 const fileId=await client.action(api.files.upload,{organizationId:org._id,kind:'menu',name:'savada-menu.jpg',contentType:'image/jpeg',bytes:photo.buffer.slice(photo.byteOffset,photo.byteOffset+photo.byteLength)});
 const jobId=await client.mutation(api.jobs.importMenu,{organizationId:org._id,name:'Savada · Demo menu',fileIds:[fileId],requestId:'initial-savada-import-v1'});
 state.menuJobId=jobId;console.log('Menu import queued:',jobId);
}
mkdirSync('test-results',{recursive:true});
writeFileSync('backend-smoke.local',JSON.stringify(state,null,2));
