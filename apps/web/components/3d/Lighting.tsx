// apps/web/components/3d/Lighting.tsx
'use client';

import { memo } from 'react';

/** Ambient + key/rim lights with a cyan/magenta cyberpunk wash. */
export const Lighting = memo(function Lighting() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[10, 10, 10]} intensity={1.6} />
      <pointLight position={[-8, 4, -6]} intensity={0.7} color="#ff00ff" />
      <directionalLight position={[0, 6, 8]} intensity={0.6} color="#00f0ff" />
    </>
  );
});
