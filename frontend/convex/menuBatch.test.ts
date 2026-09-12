/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { test,expect } from 'vitest';
import schema from './schema';
import { api } from './_generated/api';
const modules=import.meta.glob('./**/*.ts');
async function setup(){
 const t=convexTest(schema,modules);
 const userId=await t.run(ctx=>ctx.db.insert('users',{name:'Owner'}));
 const owner=t.withIdentity({subject:`${userId}|session`});
 const organizationId=await owner.mutation(api.organizations.create,{name:'Batch cafe'});
 const ids=await t.run(async ctx=>{
  const menuId=await ctx.db.insert('menus',{organizationId,name:'Menu',status:'draft',fileIds:[],warnings:[],productCount:2});
  const categoryId=await ctx.db.insert('categories',{organizationId,name:'Main',key:'main'});
  const products=[];
  for(const name of ['One','Two'])products.push(await ctx.db.insert('products',{organizationId,menuId,categoryId,name,description:null,price:100,currency:'RSD',portion:null,sourceJson:'{}',confirmed:{},needsReview:true}));
  return {menuId,products};
 });
 return {t,owner,userId,organizationId,...ids};
}
test('batch generation queues dishes once and rejects anonymous calls',async()=>{
 const s=await setup();
 await expect(s.t.mutation(api.menuBatch.generateAll,{menuId:s.menuId})).rejects.toThrow();
 expect(await s.owner.mutation(api.menuBatch.generateAll,{menuId:s.menuId})).toEqual({queued:2,skipped:0});
 expect(await s.owner.mutation(api.menuBatch.generateAll,{menuId:s.menuId})).toEqual({queued:0,skipped:2});
 const jobs=await s.owner.query(api.jobs.list,{organizationId:s.organizationId});
 expect(jobs).toHaveLength(2);
 expect(jobs.every(j=>j.status==='queued')).toBe(true);
});
test('batch approval applies valid cards and isolates malformed results',async()=>{
 const s=await setup();
 await s.t.run(async ctx=>{
  for(const [i,productId] of s.products.entries()){
   const jobId=await ctx.db.insert('jobs',{organizationId:s.organizationId,requestedBy:s.userId,requestId:`j${i}`,kind:'product',productId,status:'succeeded',attempt:1,input:{}});
   const cardId=await ctx.db.insert('cards',{organizationId:s.organizationId,productId,jobId,draftJson:i?'{}':JSON.stringify({product:{translations:{en:{name:'English dish',description:'English description'}},confirmed_ingredients:['invented']}}),warnings:[],status:'draft'});
   await ctx.db.patch(productId,{cardId});
  }
 });
 await expect(s.t.mutation(api.menuBatch.approveAll,{menuId:s.menuId})).rejects.toThrow();
 expect(await s.owner.mutation(api.menuBatch.approveAll,{menuId:s.menuId})).toEqual({approved:1,pending:0,failed:['Two']});
 const p=await s.owner.query(api.catalog.product,{organizationId:s.organizationId,productId:s.products[0]});
 expect(p).toMatchObject({name:'English dish',description:'English description',price:100,confirmed:{}});
 expect((await s.owner.mutation(api.menuBatch.approveAll,{menuId:s.menuId})).approved).toBe(0);
});
