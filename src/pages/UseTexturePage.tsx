import { OrbitControls, useTexture } from '@react-three/drei';
import { useLayoutEffect, useState } from 'react';
import { NoColorSpace, RepeatWrapping, SRGBColorSpace } from 'three';

import { textures } from '../assets';
import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { Slider } from '../ui/fields';

const example = getExample('/use-texture');
const maps = [textures.albedo, textures.roughness, textures.normal] as const;

export default function UseTexturePage() {
  const [repeat, setRepeat] = useState(2);
  const [offset, setOffset] = useState(0);
  const [anisotropy, setAnisotropy] = useState(8);
  const [metalness, setMetalness] = useState(0.15);
  const [roughness, setRoughness] = useState(0.85);
  const [normalScale, setNormalScale] = useState(1);

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider label="Повтор" min={1} max={6} step={0.1} value={repeat} onChange={setRepeat} />
          <Slider label="Сдвиг" min={0} max={1} step={0.01} value={offset} onChange={setOffset} />
          <Slider
            label="Анизотропия"
            min={1}
            max={16}
            step={1}
            value={anisotropy}
            onChange={setAnisotropy}
          />
          <Slider
            label="Металл"
            min={0}
            max={1}
            step={0.01}
            value={metalness}
            onChange={setMetalness}
          />
          <Slider
            label="Шероховатость"
            min={0}
            max={1}
            step={0.01}
            value={roughness}
            onChange={setRoughness}
          />
          <Slider
            label="Сила нормалей"
            min={0}
            max={3}
            step={0.05}
            value={normalScale}
            onChange={setNormalScale}
          />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <Textured
        repeat={repeat}
        offset={offset}
        anisotropy={anisotropy}
        metalness={metalness}
        roughness={roughness}
        normalScale={normalScale}
      />
      <OrbitControls makeDefault enableDamping />
    </ExampleFrame>
  );
}

function Textured({
  repeat,
  offset,
  anisotropy,
  metalness,
  roughness,
  normalScale,
}: {
  repeat: number;
  offset: number;
  anisotropy: number;
  metalness: number;
  roughness: number;
  normalScale: number;
}) {
  const [albedo, roughnessMap, normalMap] = useTexture([...maps]);

  useLayoutEffect(() => {
    for (const texture of [albedo, roughnessMap, normalMap]) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.offset.set(offset, offset * 0.35);
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    }
    albedo.colorSpace = SRGBColorSpace;
    roughnessMap.colorSpace = NoColorSpace;
    normalMap.colorSpace = NoColorSpace;
  }, [albedo, roughnessMap, normalMap, repeat, offset, anisotropy]);

  return (
    <>
      <mesh position={[-1.35, 0.1, 0]}>
        <planeGeometry args={[2.15, 2.15]} />
        <meshStandardMaterial map={albedo} roughness={1} metalness={0} />
      </mesh>
      <mesh position={[1.15, 0.1, 0]}>
        <sphereGeometry args={[0.95, 64, 64]} />
        <meshStandardMaterial
          map={albedo}
          roughnessMap={roughnessMap}
          normalMap={normalMap}
          metalness={metalness}
          roughness={roughness}
          normalScale={[normalScale, normalScale]}
        />
      </mesh>
    </>
  );
}

useTexture.preload([...maps]);
