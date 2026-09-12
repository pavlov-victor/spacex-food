import { useProductCard, useMenuWorkflows } from './use-menu-workflows';
import type { Product } from '@/domain/product';

export function useCardEditor(productId: Product['id']) {
  const product = useProductCard(productId);
  const flow = useMenuWorkflows();
  let english: { name: string; description: string } | null = null;
  try {
    const value = JSON.parse(product?.card?.draftJson ?? '{}').product?.translations?.en;
    if (typeof value?.name === 'string' && typeof value?.description === 'string') english = value;
  } catch { /* A malformed draft is never silently applied. */ }
  const job = flow.jobs.find(j => j._id === product?.activeJobId)
    ?? flow.jobs.find(j => j.productId === productId);
  return { product, english, job, ...flow };
}
