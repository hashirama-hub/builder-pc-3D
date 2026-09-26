export type PartCategory =
  | "cpu"
  | "gpu"
  | "mainboard"
  | "ram"
  | "ssd"
  | "psu"
  | "case"
  | "cooler"
  | "monitor"
  | "accessory";

export interface PartSpecs {
  socket?: string;
  formFactor?: string;
  tdp?: number;
  wattage?: number;
  lengthMm?: number;
  heightMm?: number;
  ramType?: "DDR4" | "DDR5";
  ramSlots?: number;
  maxGpuLengthMm?: number;
  maxCoolerHeightMm?: number;
  sataPorts?: number;
  m2Slots?: number;
  fanHeaders?: number;
  resolution?: string;
  refreshRate?: number;
  panelType?: string;
}

export interface Product {
  id: string;
  category: PartCategory;
  brand: string;
  model: string;
  specs: PartSpecs;
  priceVnd: number;
  priceUpdatedAt: string;
  stock: number;
  imageUrl: string;
  model3dUrl: string;
  rating: number;
  tier: "budget" | "mid" | "high" | "enthusiast";
}

export interface BuildPart {
  product: Product;
  slot: string; // e.g., "cpu_slot", "gpu_slot"
}

export interface Build {
  id: string;
  name: string;
  parts: BuildPart[];
  totalPriceVnd: number;
  compatible: boolean;
  warnings: string[];
  createdAt: string;
  shortId: string;
  userId?: string;
}

export interface CompatResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
}
