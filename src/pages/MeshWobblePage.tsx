import { MeshWobbleMaterial, OrbitControls } from '@react-three/drei';
import { useState } from 'react';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { ColorField, Slider } from '../ui/fields';

const example = getExample('/mesh-wobble');

export default function MeshWobblePage() {
  const [factor, setFactor] = useState(0.6);
  const [speed, setSpeed] = useState(1.4);
  const [metalness, setMetalness] = useState(0.45);
  const [roughness, setRoughness] = useState(0.28);
  const [color, setColor] = useState('#7eb6ff');

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider
            label="Амплитуда"
            min={0}
            max={2}
            step={0.01}
            value={factor}
            onChange={setFactor}
          />
          <Slider label="Скорость" min={0} max={5} step={0.05} value={speed} onChange={setSpeed} />
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
          <ColorField label="Цвет" value={color} onChange={setColor} />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <mesh position={[-1.15, 0.15, 0]}>
        <boxGeometry args={[0.7, 1.7, 0.7]} />
        <MeshWobbleMaterial
          color={color}
          factor={factor}
          speed={speed}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>
      <mesh position={[1.05, 0.1, 0]}>
        <torusKnotGeometry args={[0.52, 0.16, 180, 24]} />
        <MeshWobbleMaterial
          color={color}
          factor={factor}
          speed={speed}
          metalness={metalness}
          roughness={roughness}
        />
      </mesh>
      <OrbitControls makeDefault enableDamping />
    </ExampleFrame>
  );
}
