// apps/web/tests/compat.test.ts
import { describe, it, expect } from 'vitest';
import { checkCompatibility } from '../lib/compatEngine';
import { productSchema } from '../lib/zod';
import type { BuildPart } from '../types';

const cpu = productSchema.parse({ id:'1', category:'cpu', brand:'Intel', model:'i5-13600K', specs:{ socket:'LGA1700', tdp:125 }, priceVnd:4500000, priceUpdatedAt:'2026-01-01', stock:10, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.5, tier:'mid' });
const mb = productSchema.parse({ id:'2', category:'mainboard', brand:'MSI', model:'B760', specs:{ socket:'LGA1700', ramType:'DDR5', maxGpuLengthMm:400, maxCoolerHeightMm:160, sataPorts:4, m2Slots:2, fanHeaders:3 }, priceVnd:3500000, priceUpdatedAt:'2026-01-01', stock:5, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.2, tier:'mid' });
const gpu = productSchema.parse({ id:'4', category:'gpu', brand:'NVIDIA', model:'RTX 4080', specs:{ lengthMm:350, tdp:300 }, priceVnd:28000000, priceUpdatedAt:'2026-01-01', stock:4, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.6, tier:'high' });
const atxCase = productSchema.parse({ id:'5', category:'case', brand:'Fractal', model:'Meshify 2', specs:{ formFactor:'ATX', maxGpuLengthMm:400, maxCoolerHeightMm:160 }, priceVnd:2500000, priceUpdatedAt:'2026-01-01', stock:7, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.5, tier:'mid' });
const itxCase = productSchema.parse({ id:'6', category:'case', brand:'NZXT', model:'H1', specs:{ formFactor:'ITX', maxGpuLengthMm:400, maxCoolerHeightMm:160 }, priceVnd:3200000, priceUpdatedAt:'2026-01-01', stock:3, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.3, tier:'mid' });
const cooler = productSchema.parse({ id:'7', category:'cooler', brand:'DeepCool', model:'AK400', specs:{ heightMm:150 }, priceVnd:700000, priceUpdatedAt:'2026-01-01', stock:9, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.4, tier:'budget' });
const sataSsd = productSchema.parse({ id:'8', category:'ssd', brand:'Samsung', model:'870 EVO 1TB', specs:{ tdp:3 }, priceVnd:1800000, priceUpdatedAt:'2026-01-01', stock:20, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.7, tier:'mid' });
const m2Ssd = productSchema.parse({ id:'9', category:'ssd', brand:'Samsung', model:'990 PRO M.2 NVMe 1TB', specs:{ tdp:6 }, priceVnd:2600000, priceUpdatedAt:'2026-01-01', stock:15, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.8, tier:'high' });

/** Repeat a product N times with distinct slots, e.g. for port-count rules. */
const withSlots = (product: BuildPart['product'], count: number): BuildPart[] =>
  Array.from({ length: count }, (_, i) => ({ product, slot: `slot_${i}` }));

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

  // --- PSU wattage rule ---

  it('passes when PSU wattage covers required load', () => {
    const psu = productSchema.parse({ id:'3', category:'psu', brand:'Corsair', model:'650W', specs:{ wattage:650 }, priceVnd:1200000, priceUpdatedAt:'2026-01-01', stock:3, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:4.0, tier:'mid' });
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: psu, slot:'psu_slot' }]);
    // 125W CPU + no GPU = 125W * 1.3 = 162.5, 650W OK → no error
    expect(result.errors.some(e => e.includes('PSU'))).toBe(false);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('errors when PSU wattage is insufficient', () => {
    const psu = productSchema.parse({ id:'10', category:'psu', brand:'Corsair', model:'500W', specs:{ wattage:500 }, priceVnd:900000, priceUpdatedAt:'2026-01-01', stock:6, imageUrl:'/img.jpg', model3dUrl:'/m.glb', rating:3.9, tier:'budget' });
    // 125W CPU + 300W GPU = 425W * 1.3 = 552.5W required > 500W
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: gpu, slot:'gpu_slot' }, { product: psu, slot:'psu_slot' }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('PSU'))).toBe(true);
    expect(result.errors).toContain('PSU 500W không đủ cho 552.5W cần thiết');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  // --- Case form factor vs mainboard rule ---

  it('errors when case form factor cannot fit mainboard', () => {
    const mbAtx = { ...mb, specs: { ...mb.specs, formFactor: 'ATX' } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mbAtx, slot:'mainboard_slot' }, { product: itxCase, slot:'case_slot' }]);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Case ITX không chứa được mainboard ATX');
  });

  it('passes when case form factor fits mainboard', () => {
    const mbAtx = { ...mb, specs: { ...mb.specs, formFactor: 'ATX' } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mbAtx, slot:'mainboard_slot' }, { product: atxCase, slot:'case_slot' }]);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- GPU length vs case rule ---

  it('errors when GPU is longer than case allows', () => {
    const longGpu = { ...gpu, specs: { ...gpu.specs, lengthMm: 450 } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: longGpu, slot:'gpu_slot' }, { product: atxCase, slot:'case_slot' }]);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('GPU 450mm quá dài cho case (400mm)');
  });

  it('passes when GPU fits in case', () => {
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: gpu, slot:'gpu_slot' }, { product: atxCase, slot:'case_slot' }]);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- Cooler height vs case rule ---

  it('errors when cooler is taller than case allows', () => {
    const tallCooler = { ...cooler, specs: { ...cooler.specs, heightMm: 170 } };
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: tallCooler, slot:'cooler_slot' }, { product: atxCase, slot:'case_slot' }]);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Cooler 170mm quá cao cho case (160mm)');
  });

  it('passes when cooler fits in case', () => {
    const result = checkCompatibility([{ product: cpu, slot:'cpu_slot' }, { product: mb, slot:'mainboard_slot' }, { product: cooler, slot:'cooler_slot' }, { product: atxCase, slot:'case_slot' }]);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- SATA / M.2 port rules (warnings, do not block) ---

  it('warns when SSDs exceed SATA ports and M.2 slots', () => {
    const parts = [
      { product: cpu, slot:'cpu_slot' },
      { product: mb, slot:'mainboard_slot' },
      ...withSlots(sataSsd, 2), // 2 SATA + 3 M.2 = 5 SSDs > 4 SATA ports
      ...withSlots(m2Ssd, 3),   // 3 M.2 > 2 M.2 slots
    ];
    const result = checkCompatibility(parts);
    expect(result.warnings).toContain('Không đủ SATA port (4) cho 5 SSD');
    expect(result.warnings).toContain('Không đủ M.2 slot (2)');
    expect(result.errors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it('passes without port warnings when SSDs fit the slots', () => {
    const parts = [
      { product: cpu, slot:'cpu_slot' },
      { product: mb, slot:'mainboard_slot' },
      ...withSlots(sataSsd, 2), // 2 SATA + 2 M.2 = 4 SSDs = 4 SATA ports
      ...withSlots(m2Ssd, 2),   // 2 M.2 = 2 M.2 slots
    ];
    const result = checkCompatibility(parts);
    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.ok).toBe(true);
  });
});
