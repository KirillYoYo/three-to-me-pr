import { MeshDistortMaterial, OrbitControls } from '@react-three/drei';
import { useState } from 'react';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { ColorField, Slider } from '../ui/fields';

const example = getExample('/mesh-distort');

export default function MeshDistortPage() {
  const [distort, setDistort] = useState(0.45);
  const [speed, setSpeed] = useState(1.6);
  const [radius, setRadius] = useState(1);
  const [roughness, setRoughness] = useState(0.2);
  const [color, setColor] = useState('#ef6d6d');

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider
            label="Сила шума"
            min={0}
            max={1}
            step={0.01}
            value={distort}
            onChange={setDistort}
          />
          <Slider label="Скорость" min={0} max={5} step={0.05} value={speed} onChange={setSpeed} />
          <Slider
            label="Радиус"
            min={0.4}
            max={1.6}
            step={0.01}
            value={radius}
            onChange={setRadius}
          />
          <Slider
            label="Шероховатость"
            min={0}
            max={1}
            step={0.01}
            value={roughness}
            onChange={setRoughness}
          />
          <ColorField label="Цвет" value={color} onChange={setColor} />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <mesh>
        <sphereGeometry args={[1.05, 128, 128]} />
        <MeshDistortMaterial
          color={color}
          distort={distort}
          speed={speed}
          radius={radius}
          roughness={roughness}
          metalness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </mesh>
      <OrbitControls makeDefault enableDamping autoRotate autoRotateSpeed={0.6} />
    </ExampleFrame>
  );
}
