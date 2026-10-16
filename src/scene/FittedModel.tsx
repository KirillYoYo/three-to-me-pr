import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Group, Object3D } from 'three';

import { disposeMaterials, fitClone, isMesh, paintMaterial } from './fit';

export function FittedModel({
  source,
  scale,
  spin,
  wireframe,
  color,
  rotationX = 0,
}: {
  source: Object3D;
  scale: number;
  spin: number;
  wireframe: boolean;
  color?: string;
  rotationX?: number;
}) {
  const [fitted, setFitted] = useState<Group | null>(null);
  const spinRef = useRef<Group>(null);

  useEffect(() => {
    const next = fitClone(source);
    setFitted(next);
    return () => {
      disposeMaterials(next);
    };
  }, [source]);

  useLayoutEffect(() => {
    if (!fitted) return;
    fitted.traverse((child) => {
      if (!isMesh(child)) return;
      const material = child.material;
      const list = Array.isArray(material) ? material : [material];
      for (const item of list) paintMaterial(item, wireframe, color);
    });
  }, [fitted, wireframe, color]);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * spin;
  });

  if (!fitted) return null;

  return (
    <group ref={spinRef} scale={scale}>
      <group rotation={[rotationX, 0, 0]}>
        <primitive object={fitted} />
      </group>
    </group>
  );
}
