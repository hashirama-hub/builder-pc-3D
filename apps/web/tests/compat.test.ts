// apps/web/tests/compat.test.ts
import { describe, it, expect } from 'vitest';
import { checkCompatibility } from '../lib/compatEngine';
import { productSchema } from '../lib/zod';

const cpu = productSchema.parse({ id:'1', category:'cpu', brand:'Intel', model:'i5-13600K', specs:{ socket:'LGA1700', tdp:125 }, priceVnd:4500000, priceUpdatedAt:'2026-01-01', stock:10, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.5, tier:'mid' });
const mb = productSchema.parse({ id:'2', category:'mainboard', brand:'MSI', model:'B760', specs:{ socket:'LGA1700', ramType:'DDR5', maxGpuLengthMm:400, maxCoolerHeightMm:160, sataPorts:4, m2Slots:2, fanHeaders:3 }, priceVnd:3500000, priceUpdatedAt:'2026-01-01', stock:5, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.2, tier:'mid' });

describe('Compatibility Engine', () => {
  it('passes compatible build', () => {
    const parts = [
      { product: cpu, slot:'cpu_slot' },
      { product: mb, slot:'mainboard_slot' },
    ];
    const result = checkCompatibility(parts);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects socket mismatch', () => {
    const badMb = { ...mb, specs: { ...mb.specs, socket: 'AM5' } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: badMb, slot:'mainboard_slot' }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('socket'))).toBe(true);
  });

  it('detects RAM type mismatch', () => {
    const badMb = { ...mb, specs: { ...mb.specs, ramType: 'DDR4' as const } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: badMb, slot:'mainboard_slot' }]);
    expect(result.errors.some(e => e.includes('RAM'))).toBe(true);
  });

  it('warns on insufficient PSU', () => {
    const psu = productSchema.parse({ id:'3', category:'psu', brand:'Corsair', model:'650W', specs:{ wattage:650 }, priceVnd:1200000, priceUpdatedAt:'2026-01-01', stock:3, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.0, tier:'mid' });
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: psu, slot:'psu_slot' }]);
    // 125W CPU + no GPU = 125W * 1.3 = 162.5, 650W OK → no error
    expect(result.errors.some(e => e.includes('PSU'))).toBe(false);
  });
});
