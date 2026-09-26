import { describe, it, expect } from 'vitest';
import { productSchema } from '../lib/zod';

describe('Product schema', () => {
  it('validates valid product', () => {
    const p = productSchema.parse({
      id: '1', category: 'cpu', brand: 'Intel', model: 'i5-13600K',
      specs: { socket: 'LGA1700', tdp: 125 }, priceVnd: 4500000,
      priceUpdatedAt: '2026-01-01', stock: 10,
      imageUrl: '/img.jpg', model3dUrl: '/model.glb', rating: 4.5, tier: 'mid',
    });
    expect(p.brand).toBe('Intel');
  });

  it('rejects missing required field', () => {
    expect(() => productSchema.parse({ id: '1' })).toThrow();
  });
});