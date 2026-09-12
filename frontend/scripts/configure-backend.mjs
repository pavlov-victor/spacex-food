// Run from frontend/. Values travel over stdin and are never printed.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
function cli(args, input) {
 const result=spawnSync('npx',['convex',...args],{input,encoding:'utf8'});
 if(result.status!==0)throw new Error(`Convex command failed: ${args.slice(0,2).join(' ')}. Check authentication/deployment.`);
 return result.stdout;
}
const existing=cli(['env','list']);
if(!existing.includes('JWT_PRIVATE_KEY=') && !existing.includes('JWKS=')) {
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 cli(['env','set','JWT_PRIVATE_KEY'],privateKey.export({type:'pkcs8',format:'pem'}).toString().trim().replace(/\n/g,' '));
 cli(['env','set','JWKS'],JSON.stringify({keys:[{use:'sig',...publicKey.export({format:'jwk'})}]}));
 console.log('Created Convex Auth signing keys.');
} else if(!existing.includes('JWT_PRIVATE_KEY=') || !existing.includes('JWKS=')) throw new Error('Incomplete auth key pair; repair deployment environment first.');
else console.log('Existing auth signing keys preserved.');
const values=Object.fromEntries(readFileSync('../.env','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#')&&l.includes('=')).map(l=>{const pos=l.indexOf('=');return [l.slice(0,pos).trim(),l.slice(pos+1).trim().replace(/^(['"])(.*)\1$/,'$2')]}));
for(const key of ['DIFY_MENU_API','DIFY_PERSON_API']) {
 if(!values[key])throw new Error(`Missing ${key} in ../.env`);
 cli(['env','set',key],values[key]);console.log(`Configured ${key}.`);
}
cli(['env','set','DIFY_API_URL'],values.DIFY_API_URL||'https://api.dify.ai/v1');
console.log('Backend environment configured. No secrets written to source files.');
