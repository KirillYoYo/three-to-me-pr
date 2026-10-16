import { Environment, Html, OrbitControls, useEnvironment } from '@react-three/drei';
import { useState } from 'react';

import { type EnvironmentId, environments } from '../assets';
import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { SelectField, Slider, Toggle } from '../ui/fields';

const example = getExample('/environment');

const options = environments.map((item) => ({ value: item.id, label: item.label }));

export default function EnvironmentPage() {
  const [preset, setPreset] = useState<EnvironmentId>('sunset');
  const [background, setBackground] = useState(true);
  const [blur, setBlur] = useState(0);
  const [backgroundIntensity, setBackgroundIntensity] = useState(1);
  const [environmentIntensity, setEnvironmentIntensity] = useState(1);
  const [ground, setGround] = useState(false);
  const file = environments.find((item) => item.id === preset)?.file ?? environments[0].file;

  return (
    <ExampleFrame
      example={example}
      camera={{ position: [0, 1.35, 6.2], fov: 42 }}
      controls={
        <>
          <SelectField label="HDR" value={preset} options={options} onChange={setPreset} />
          <Toggle label="Фон" value={background} onChange={setBackground} />
          <Toggle label="Проекция на пол" value={ground} onChange={setGround} />
          <Slider
            label="Размытие фона"
            min={0}
            max={1}
            step={0.01}
            value={blur}
            onChange={setBlur}
          />
          <Slider
            label="Яркость фона"
            min={0}
            max={2.5}
            step={0.05}
            value={backgroundIntensity}
            onChange={setBackgroundIntensity}
          />
          <Slider
            label="Сила отражения"
            min={0}
            max={3}
            step={0.05}
            value={environmentIntensity}
            onChange={setEnvironmentIntensity}
          />
        </>
      }
    >
      <ambientLight intensity={0.15} />
      <Environment
        key={file}
        files={file}
        background={background}
        backgroundBlurriness={blur}
        backgroundIntensity={backgroundIntensity}
        environmentIntensity={environmentIntensity}
        ground={ground ? { height: 10, radius: 70, scale: 80 } : false}
      />
      {([1, 0.75, 0.5, 0.25, 0] as const).map((roughness, index) => (
        <group key={roughness} position={[(index - 2) * 0.9, 0.35, 0]}>
          <mesh>
            <sphereGeometry args={[0.38, 64, 64]} />
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={roughness} />
          </mesh>
          <Html position={[0, -0.62, 0]} center distanceFactor={10}>
            <span className="mini-label">{roughness.toFixed(2)}</span>
          </Html>
        </group>
      ))}
      <OrbitControls makeDefault target={[0, 0.35, 0]} enableDamping />
    </ExampleFrame>
  );
}

for (const item of environments) {
  useEnvironment.preload({ files: item.file });
}
