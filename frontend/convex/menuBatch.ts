import { mutation } from './_generated/server';
import { api } from './_generated/api';
import { v } from 'convex/values';
import { requireOrganization } from './lib/access';
import type { Id } from './_generated/dataModel';

export const approveAll = mutation({
  args: { menuId: v.id('menus') },
  handler: async (ctx, { menuId }): Promise<{approved:number;pending:number;failed:string[]}> => {
    const menu = await ctx.db.get(menuId);
    if (!menu) throw new Error('Menu not found.');
    await requireOrganization(ctx,menu.organizationId);
    const products = await ctx.db.query('products').withIndex('by_organizationId_and_menuId',q=>q.eq('organizationId',menu.organizationId).eq('menuId',menuId)).take(251);
    if(products.length>250)throw new Error('Use menus with up to 250 dishes.');
    let approved=0,pending=0;const failed:string[]=[];
    for(const p of products){
      if(p.activeJobId){pending++;continue;}
      if(!p.cardId || p.acceptedCardId===p.cardId)continue;
      try{
        await ctx.runMutation(api.catalog.applyCard,{organizationId:menu.organizationId,productId:p._id,cardId:p.cardId,reviewed:true});
        approved++;
      }catch{failed.push(p.name);}
    }
    return {approved,pending,failed};
  },
});

export const generateAll = mutation({
  args: { menuId: v.id('menus') },
  handler: async (ctx,{menuId}): Promise<{queued:number;skipped:number}> => {
    const menu=await ctx.db.get(menuId);
    if(!menu)throw new Error('Menu not found.');
    await requireOrganization(ctx,menu.organizationId);
    if(menu.status!=='draft')throw new Error('Wait for menu recognition to finish.');
    const products=await ctx.db.query('products').withIndex('by_organizationId_and_menuId',q=>q.eq('organizationId',menu.organizationId).eq('menuId',menuId)).take(251);
    if(products.length>250)throw new Error('Use menus with up to 250 dishes.');
    let queued=0,skipped=0;
    for(const p of products){
      const card=p.cardId?await ctx.db.get(p.cardId):null;
      if(p.activeJobId || card?.imageFileId){skipped++;continue;}
      // Queueing is transactional. Repeated clicks skip already-active products.
      const jobId:Id<'jobs'>=await ctx.runMutation(api.jobs.generateCard,{organizationId:menu.organizationId,productId:p._id,requestId:`batch:${p._id}:${Date.now()}`,queueDelayMs:queued*3000});
      if(jobId)queued++;
    }
    return {queued,skipped};
  },
});
