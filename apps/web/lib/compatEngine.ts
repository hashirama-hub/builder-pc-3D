// apps/web/lib/compatEngine.ts
import type { Product, BuildPart, CompatResult } from '../types';

function findPart(parts: BuildPart[], category: string): Product | undefined {
  return parts.find(p => p.product.category === category)?.product;
}

export function checkCompatibility(parts: BuildPart[]): CompatResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cpu = findPart(parts, 'cpu');
  const mb = findPart(parts, 'mainboard');
  const ram = findPart(parts, 'ram');
  const gpu = findPart(parts, 'gpu');
  const psu = findPart(parts, 'psu');
  const case_ = findPart(parts, 'case');
  const cooler = findPart(parts, 'cooler');

  // Socket
  if (cpu && mb) {
    const socket = cpu.specs.socket;
    const mbSocket = mb.specs.socket;
    if (socket && mbSocket && socket !== mbSocket) {
      errors.push(`CPU socket ${socket} không khớp mainboard ${mbSocket}`);
    }
  }

  // RAM
  if (cpu && mb) {
    const ramType = cpu.specs.ramType || 'DDR5';
    if (mb.specs.ramType && mb.specs.ramType !== ramType) {
      errors.push(`RAM ${ramType} không khớp mainboard ${mb.specs.ramType}`);
    }
  }

  // RAM module vs mainboard
  if (ram && mb) {
    const moduleRamType = ram.specs.ramType;
    const mbRamType = mb.specs.ramType;
    if (moduleRamType && mbRamType && moduleRamType !== mbRamType) {
      errors.push(`RAM ${moduleRamType} không khớp mainboard ${mbRamType}`);
    }
  }

  // PSU wattage
  if (psu && parts.length > 0) {
    const totalTdp = parts.reduce((sum, p) => sum + (p.product.specs.tdp || 0), 0);
    const required = totalTdp * 1.3;
    if (psu.specs.wattage && psu.specs.wattage < required) {
      errors.push(`PSU ${psu.specs.wattage}W không đủ cho ${required}W cần thiết`);
    }
  }

  // Case form factor
  if (case_ && mb) {
    const caseFF = case_.specs.formFactor;
    const mbFF = mb.specs.formFactor;
    if (caseFF && mbFF) {
      const priority: Record<string, number> = { ITX: 0, mATX: 1, ATX: 2, EATX: 3 };
      if ((priority[caseFF] ?? 0) < (priority[mbFF] ?? 0)) {
        errors.push(`Case ${caseFF} không chứa được mainboard ${mbFF}`);
      }
    }
  }

  // GPU length
  if (gpu && case_) {
    if (gpu.specs.lengthMm && case_.specs.maxGpuLengthMm && gpu.specs.lengthMm > case_.specs.maxGpuLengthMm) {
      errors.push(`GPU ${gpu.specs.lengthMm}mm quá dài cho case (${case_.specs.maxGpuLengthMm}mm)`);
    }
  }

  // Cooler height
  if (cooler && case_) {
    if (cooler.specs.heightMm && case_.specs.maxCoolerHeightMm && cooler.specs.heightMm > case_.specs.maxCoolerHeightMm) {
      errors.push(`Cooler ${cooler.specs.heightMm}mm quá cao cho case (${case_.specs.maxCoolerHeightMm}mm)`);
    }
  }

  // Ports
  if (mb) {
    const ssdCount = parts.filter(p => p.product.category === 'ssd').length;
    if (mb.specs.sataPorts !== undefined && ssdCount > mb.specs.sataPorts) {
      warnings.push(`Không đủ SATA port (${mb.specs.sataPorts}) cho ${ssdCount} SSD`);
    }
    const m2Count = parts.filter(p => p.product.category === 'ssd' && p.product.model.toLowerCase().includes('m.2')).length;
    if (mb.specs.m2Slots !== undefined && m2Count > mb.specs.m2Slots) {
      warnings.push(`Không đủ M.2 slot (${mb.specs.m2Slots})`);
    }
  }

  return { ok: errors.length === 0, warnings, errors };
}
