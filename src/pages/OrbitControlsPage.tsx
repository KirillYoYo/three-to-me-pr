import { OrbitControls } from '@react-three/drei';
import { useState } from 'react';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { Slider, Toggle } from '../ui/fields';

const example = getExample('/orbit-controls');

export default function OrbitControlsPage() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(1.4);
  const [damping, setDamping] = useState(true);
  const [dampingFactor, setDampingFactor] = useState(0.08);
  const [rotateSpeed, setRotateSpeed] = useState(1);
  const [zoomSpeed, setZoomSpeed] = useState(1);
  const [enablePan, setEnablePan] = useState(true);
  const [enableZoom, setEnableZoom] = useState(true);
  const [minDistance, setMinDistance] = useState(2);
  const [maxDistance, setMaxDistance] = useState(9);
  const [minPolar, setMinPolar] = useState(15);
  const [maxPolar, setMaxPolar] = useState(120);

  const polarMax = Math.max(maxPolar, minPolar + 5);
  const distanceMax = Math.max(maxDistance, minDistance + 0.5);

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Toggle label="Автоповорот" value={autoRotate} onChange={setAutoRotate} />
          <Slider
            label="Скорость автоповорота"
            min={0.2}
            max={6}
            step={0.1}
            value={autoRotateSpeed}
            onChange={setAutoRotateSpeed}
          />
          <Toggle label="Инерция" value={damping} onChange={setDamping} />
          <Slider
            label="Сила инерции"
            min={0.02}
            max={0.3}
            step={0.01}
            value={dampingFactor}
            onChange={setDampingFactor}
          />
          <Slider
            label="Скорость вращения"
            min={0.2}
            max={3}
            step={0.1}
            value={rotateSpeed}
            onChange={setRotateSpeed}
          />
          <Slider
            label="Скорость зума"
            min={0.2}
            max={3}
            step={0.1}
            value={zoomSpeed}
            onChange={setZoomSpeed}
          />
          <Toggle label="Сдвиг" value={enablePan} onChange={setEnablePan} />
          <Toggle label="Зум" value={enableZoom} onChange={setEnableZoom} />
          <Slider
            label="Мин. дистанция"
            min={1}
            max={6}
            step={0.1}
            value={minDistance}
            onChange={setMinDistance}
          />
          <Slider
            label="Макс. дистанция"
            min={3}
            max={16}
            step={0.1}
            value={maxDistance}
            onChange={setMaxDistance}
          />
          <Slider
            label="Мин. угол, °"
            min={0}
            max={80}
            step={1}
            value={minPolar}
            onChange={setMinPolar}
          />
          <Slider
            label="Макс. угол, °"
            min={40}
            max={180}
            step={1}
            value={maxPolar}
            onChange={setMaxPolar}
          />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <mesh position={[-1.15, 0.15, 0.2]}>
        <torusGeometry args={[0.48, 0.16, 32, 64]} />
        <meshStandardMaterial color="#e4a15a" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[0.95, 0.05, 0.45]}>
        <sphereGeometry args={[0.48, 48, 48]} />
        <meshStandardMaterial color="#7eb6ff" metalness={0.15} roughness={0.22} />
      </mesh>
      <mesh position={[0.15, 0.55, -0.7]}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color="#ef6d6d" metalness={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4, 16]} />
        <meshStandardMaterial color="#ece7df" metalness={0.5} roughness={0.35} />
      </mesh>
      <OrbitControls
        makeDefault
        target={[0, 0.15, 0]}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        enableDamping={damping}
        dampingFactor={dampingFactor}
        rotateSpeed={rotateSpeed}
        zoomSpeed={zoomSpeed}
        enablePan={enablePan}
        enableZoom={enableZoom}
        minDistance={minDistance}
        maxDistance={distanceMax}
        minPolarAngle={(minPolar * Math.PI) / 180}
        maxPolarAngle={(polarMax * Math.PI) / 180}
      />
    </ExampleFrame>
  );
}
