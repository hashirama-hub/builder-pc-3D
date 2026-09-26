import { describe, it, expect } from 'vitest';
import { parsePartDragData, serializePartDragData, PART_MIME, type PartDragPayload } from '../lib/dnd';
import type { Product } from '../types';

const product: Product = {
  id: 'cpu-1',
  category: 'cpu',
  brand: 'AMD',
  model: 'Ryzen 7 7800X3D',
  specs: { socket: 'AM5' },
  priceVnd: 9000000,
  priceUpdatedAt: '2026-09-01T00:00:00Z',
  stock: 5,
  imageUrl: '/img/cpu.png',
  model3dUrl: '/models/cpu.glb',
  rating: 4.8,
  tier: 'high',
};

describe('PART_MIME', () => {
  it('is a custom drag MIME type', () => {
    expect(PART_MIME).toBe('application/x-pc-builder-part');
  });
});

describe('serializePartDragData / parsePartDragData', () => {
  it('round-trips a full product payload', () => {
    const payload: PartDragPayload = { category: 'cpu', product };
    const parsed = parsePartDragData(serializePartDragData(payload));
    expect(parsed).not.toBeNull();
    expect(parsed?.category).toBe('cpu');
    expect(parsed?.product?.id).toBe('cpu-1');
    expect(parsed?.product?.priceVnd).toBe(9000000);
    expect(parsed?.product?.specs.socket).toBe('AM5');
  });

  it('round-trips a category-only payload', () => {
    const parsed = parsePartDragData(serializePartDragData({ category: 'gpu' }));
    expect(parsed).toEqual({ category: 'gpu' });
    expect(parsed?.product).toBeUndefined();
  });

  it('keeps a string id when no product object is attached', () => {
    const parsed = parsePartDragData(serializePartDragData({ category: 'ram', id: 'ram-9' }));
    expect(parsed).toEqual({ category: 'ram', id: 'ram-9' });
  });

  it('rejects null, empty and non-JSON input', () => {
    expect(parsePartDragData(null)).toBeNull();
    expect(parsePartDragData(undefined)).toBeNull();
    expect(parsePartDragData('')).toBeNull();
    expect(parsePartDragData('not-json')).toBeNull();
    expect(parsePartDragData('42')).toBeNull();
    expect(parsePartDragData('"cpu"')).toBeNull();
  });

  it('rejects a payload with a missing or unknown category', () => {
    expect(parsePartDragData(JSON.stringify({ id: 'x' }))).toBeNull();
    expect(parsePartDragData(JSON.stringify({ category: 'quantum' }))).toBeNull();
    expect(parsePartDragData(JSON.stringify({ category: 7 }))).toBeNull();
  });

  it('drops a malformed product but keeps the category', () => {
    const parsed = parsePartDragData(
      JSON.stringify({ category: 'cpu', product: { model: 'broken' } })
    );
    expect(parsed).toEqual({ category: 'cpu' });
  });

  it('drops a product whose category disagrees with the payload', () => {
    const parsed = parsePartDragData(
      JSON.stringify({ category: 'cpu', product: { ...product, category: 'gpu' } })
    );
    expect(parsed).toEqual({ category: 'cpu' });
  });
});
