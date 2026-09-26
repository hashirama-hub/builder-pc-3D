import { describe, it, expect } from 'vitest';
import { useBuildStore } from '../stores/useBuildStore';

describe('Build Store', () => {
  it('adds part', () => {
    const store = useBuildStore.getState();
    store.addPart({ product: {} as any, slot: 'cpu_slot' });
    expect(store.parts.length).toBe(1);
  });

  it('removes part', () => {
    const store = useBuildStore.getState();
    store.removePart('cpu_slot');
    expect(store.parts.length).toBe(0);
  });

  it('computes total', () => {
    const store = useBuildStore.getState();
    store.addPart({ product: { id:'1', category:'cpu', brand:'Intel', model:'i5', specs:{}, priceVnd:4500000, priceUpdatedAt:'', stock:1, imageUrl:'', model3dUrl:'', rating:0, tier:'mid' }, slot:'cpu_slot' });
    expect(store.totalPriceVnd).toBe(4500000);
  });
});
