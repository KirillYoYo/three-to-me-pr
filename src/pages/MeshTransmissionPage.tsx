import { Environment, MeshTransmissionMaterial, OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type { Group } from 'three';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { ColorField, Slider, Toggle } from '../ui/fields';

const example = getExample('/mesh-transmission');

const colors = ['#e4a15a', '#ef6d6d', '#7eb6ff', '#8ddeb5', '#d7c4ff', '#f2e27a'];

export default function MeshTransmissionPage() {
  const [thickness, setThickness] = useState(0.8);
  const [roughness, setRoughness] = useState(0.05);
  const [chromaticAberration, setChromaticAberration] = useState(0.25);
  const [distortion, setDistortion] = useState(0.2);
  const [temporalDistortion, setTemporalDistortion] = useState(0.12);
  const [transmission, setTransmission] = useState(1);
  const [ior, setIor] = useState(1.4);
  const [samples, setSamples] = useState(6);
  const [backside, setBackside] = useState(false);
  const [color, setColor] = useState('#ffffff');

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider
            label="Прозрачность"
            min={0}
            max={1}
            step={0.01}
            value={transmission}
            onChange={setTransmission}
          />
          <Slider
            label="Толщина"
            min={0}
            max={3}
            step={0.05}
            value={thickness}
            onChange={setThickness}
          />
          <Slider
            label="Шероховатость"
            min={0}
            max={0.6}
            step={0.01}
            value={roughness}
            onChange={setRoughness}
          />
          <Slider
            label="Хроматическая аберрация"
            min={0}
            max={1}
            step={0.01}
            value={chromaticAberration}
            onChange={setChromaticAberration}
          />
          <Slider
            label="Искажение"
            min={0}
            max={1}
            step={0.01}
            value={distortion}
            onChange={setDistortion}
          />
          <Slider
            label="Движение искажения"
            min={0}
            max={1}
            step={0.01}
            value={temporalDistortion}
            onChange={setTemporalDistortion}
          />
          <Slider label="IOR" min={1} max={2.4} step={0.01} value={ior} onChange={setIor} />
          <Slider label="Сэмплы" min={1} max={12} step={1} value={samples} onChange={setSamples} />
          <Toggle label="Задняя грань" value={backside} onChange={setBackside} />
          <ColorField label="Оттенок" value={color} onChange={setColor} />
        </>
      }
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 5, 3]} intensity={2} />
      <Environment files="/hdri/studio.hdr" environmentIntensity={0.8} />
      <Backdrop />
      <mesh>
        <sphereGeometry args={[1.05, 64, 64]} />
        <MeshTransmissionMaterial
          backside={backside}
          samples={samples}
          resolution={384}
          transmission={transmission}
          thickness={thickness}
          backsideThickness={thickness}
          roughness={roughness}
          chromaticAberration={chromaticAberration}
          distortion={distortion}
          distortionScale={distortion}
          temporalDistortion={temporalDistortion}
          ior={ior}
          color={color}
          attenuationColor={color}
          attenuationDistance={0.6}
        />
      </mesh>
      <OrbitControls makeDefault enableDamping autoRotate autoRotateSpeed={0.45} />
    </ExampleFrame>
  );
}

function Backdrop() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={ref}>
      {colors.map((color, index) => {
        const angle = (index / colors.length) * Math.PI * 2;
        return (
          <mesh
            key={color}
            position={[
              Math.sin(angle) * 2.35,
              Math.sin(index * 1.7) * 0.45,
              Math.cos(angle) * 2.35,
            ]}
          >
            <boxGeometry args={[0.72, 0.72, 0.72]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}
