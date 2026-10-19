import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export function BigBen(props: JSX.IntrinsicElements['group']) {
  const { scene } = useGLTF('/models/big-ben.glb');
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      // delta — время с прошлого кадра в секундах, поэтому скорость не зависит от FPS
      groupRef.current.rotation.y += delta * 0.2; // 0.2 рад/сек ≈ 11°/сек
    }
  });

  return (
    <group ref={groupRef} {...props}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload('/models/big-ben.glb');
