// apps/web/components/3d/Scene.tsx
'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import Image from 'next/image';
import { Fragment, memo, useState } from 'react';
import type { PartCategory } from '@/types';
import { useBuildStore } from '@/stores/useBuildStore';
import { Case3D } from './Case3D';
import { Lighting } from './Lighting';
import { PartBox, Slot } from './Slot';

interface SlotLayout {
  /** Matches `mapCategoryToSlot()` ids from `lib/api.ts`. */
  slot: string;
  label: string;
  position: [number, number, number];
  size: [number, number, number];
}

/** Fixed slot positions inside the case (see design decision #2). */
const SLOT_LAYOUT: SlotLayout[] = [
  { slot: 'mainboard_slot', label: 'Mainboard', position: [0, 0.3, -0.95], size: [3.6, 3.4, 0.14] },
  { slot: 'cpu_slot', label: 'CPU', position: [0, 1.5, 0], size: [1, 1, 0.35] },
  { slot: 'ram_slot', label: 'RAM', position: [-1.5, 0.5, 0], size: [0.5, 1.3, 0.45] },
  { slot: 'gpu_slot', label: 'VGA', position: [1.8, 0.5, 0.1], size: [1.2, 0.6, 0.45] },
  { slot: 'psu_slot', label: 'PSU', position: [0, -1, 0.5], size: [1.2, 0.8, 1.1] },
  { slot: 'ssd_slot', label: 'SSD', position: [-1, -1, 0.5], size: [0.8, 0.3, 0.7] },
  { slot: 'cooler_slot', label: 'Cooler', position: [-1.2, 1.8, 0.3], size: [0.9, 0.5, 0.6] },
];

const CATEGORY_COLORS: Record<PartCategory, string> = {
  cpu: '#00f0ff',
  gpu: '#ff00ff',
  mainboard: '#00ff88',
  ram: '#ff6b00',
  ssd: '#ffd700',
  psu: '#ff3355',
  case: '#94a3b8',
  cooler: '#60a5fa',
  monitor: '#a78bfa',
  accessory: '#f472b6',
};

/** Installed parts render slightly smaller than their slot so the slot acts as a frame. */
function shrink(size: [number, number, number]): [number, number, number] {
  return [size[0] * 0.85, size[1] * 0.85, size[2] * 0.85];
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

function WebGLFallback() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-cyber-900 p-8 text-center">
      <Image
        src="/webgl-fallback.svg"
        alt="Mô hình 3D không khả dụng"
        width={420}
        height={280}
        unoptimized
        className="max-w-full opacity-80"
      />
      <p className="max-w-md text-sm text-slate-300">
        Trình duyệt của bạn không hỗ trợ WebGL nên không thể hiển thị mô hình 3D.
      </p>
      <p className="max-w-md text-xs text-slate-500">
        Bạn vẫn có thể lắp cấu hình bình thường bằng bảng linh kiện bên trái.
      </p>
    </div>
  );
}

function Scene() {
  const parts = useBuildStore((state) => state.parts);
  const [hasWebGL] = useState(detectWebGL);

  if (!hasWebGL) return <WebGLFallback />;

  return (
    <div className="h-full w-full">
      <Canvas shadows camera={{ position: [6.5, 4.5, 7], fov: 45 }}>
        <color attach="background" args={['#0a0a0f']} />
        <Lighting />
        <Case3D />
        {SLOT_LAYOUT.map((entry) => {
          const installed = parts.find((part) => part.slot === entry.slot);
          return (
            <Fragment key={entry.slot}>
              <Slot
                position={entry.position}
                size={entry.size}
                label={entry.label}
                showLabel={!installed}
              />
              {installed && (
                <PartBox
                  position={entry.position}
                  size={shrink(entry.size)}
                  color={CATEGORY_COLORS[installed.product.category]}
                  label={truncate(installed.product.model, 22)}
                />
              )}
            </Fragment>
          );
        })}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={24}
          maxPolarAngle={Math.PI * 0.9}
        />
      </Canvas>
    </div>
  );
}

export default memo(Scene);
