// apps/web/components/3d/Slot.tsx
'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useRef, useState } from 'react';
import type { Mesh } from 'three';

export interface SlotProps {
  position: [number, number, number];
  size: [number, number, number];
  label: string;
  showLabel?: boolean;
}

/** Translucent drop zone; glows cyan on hover. */
export const Slot = memo(function Slot({ position, size, label, showLabel = true }: SlotProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={hovered ? '#00f0ff' : '#1a1a2e'}
          emissive={hovered ? '#00f0ff' : '#000000'}
          emissiveIntensity={hovered ? 0.8 : 0}
          transparent
          opacity={hovered ? 0.55 : 0.28}
        />
      </mesh>
      {showLabel && (
        <Html
          position={[0, size[1] / 2 + 0.18, 0]}
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[20, 0]}
        >
          <span className="whitespace-nowrap rounded bg-cyber-900/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyber-accent/80">
            {label}
          </span>
        </Html>
      )}
    </group>
  );
});

export interface PartBoxProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
}

/** An installed part: coloured box with a gentle float + sway animation. */
export const PartBox = memo(function PartBox({ position, size, color, label }: PartBoxProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const time = state.clock.elapsedTime;
    mesh.position.y = Math.sin(time * 1.4 + position[0]) * 0.07;
    mesh.rotation.y = Math.sin(time * 0.5 + position[1]) * 0.1;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      <Html
        position={[0, size[1] / 2 + 0.2, 0]}
        center
        style={{ pointerEvents: 'none' }}
        zIndexRange={[30, 0]}
      >
        <span
          className="inline-block max-w-[180px] truncate whitespace-nowrap rounded bg-cyber-900/85 px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ color }}
        >
          {label}
        </span>
      </Html>
    </group>
  );
});
