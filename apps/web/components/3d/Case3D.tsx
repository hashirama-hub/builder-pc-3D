// apps/web/components/3d/Case3D.tsx
'use client';

import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useRef } from 'react';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

const SHELL_SIZE: [number, number, number] = [5, 4.6, 2.6];
const FRONT_Z = SHELL_SIZE[2] / 2;

/** RGB-ish spinning fan mounted on the case front. */
function Fan3D() {
  const bladesRef = useRef<Group>(null);
  const hubRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (bladesRef.current) bladesRef.current.rotation.y += delta * 5;
    const hub = hubRef.current;
    if (hub) {
      const material = hub.material as MeshStandardMaterial;
      const hue = (state.clock.elapsedTime * 0.15) % 1;
      material.color.setHSL(hue, 1, 0.55);
      material.emissive.setHSL(hue, 1, 0.45);
    }
  });

  return (
    <group position={[1.6, 1.4, FRONT_Z + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
      {/* frame ring */}
      <mesh>
        <torusGeometry args={[0.58, 0.05, 8, 32]} />
        <meshStandardMaterial color="#24243e" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* hub */}
      <mesh ref={hubRef}>
        <cylinderGeometry args={[0.16, 0.16, 0.1, 24]} />
        <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.6} />
      </mesh>
      {/* blades */}
      <group ref={bladesRef}>
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = (index * Math.PI * 2) / 5;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.44, 0.02, 0.16]} />
              <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.45} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/** Low-poly case shell + static motherboard tray + front fan. */
export const Case3D = memo(function Case3D() {
  return (
    <group>
      {/* translucent shell */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={SHELL_SIZE} />
        <meshStandardMaterial
          color="#12121a"
          transparent
          opacity={0.22}
          roughness={0.6}
          metalness={0.2}
        />
        <Edges color="#00f0ff" scale={1.002} />
      </mesh>

      {/* motherboard tray (PCB) */}
      <mesh position={[0, 0.3, -1.05]} receiveShadow>
        <boxGeometry args={[3.6, 3.4, 0.08]} />
        <meshStandardMaterial color="#0f2f2a" roughness={0.85} />
        <Edges color="#00ff88" scale={1.002} />
      </mesh>

      {/* PSU shroud */}
      <mesh position={[0, -1.7, 0]}>
        <boxGeometry args={[4.6, 0.7, 2.2]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
        <Edges color="#ff00ff" scale={1.002} />
      </mesh>

      <Fan3D />
    </group>
  );
});
