import { PresentationControls, RoundedBox } from '@react-three/drei';
import { useState } from 'react';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { ColorField, SelectField, Slider, Toggle } from '../ui/fields';

const example = getExample('/presentation-controls');

const snapModes = [
  { value: 'off', label: 'Выключен' },
  { value: 'soft', label: 'Мягкий возврат' },
  { value: 'fast', label: 'Быстрый возврат' },
] as const;

type SnapMode = (typeof snapModes)[number]['value'];

export default function PresentationControlsPage() {
  const [speed, setSpeed] = useState(1.2);
  const [damping, setDamping] = useState(0.22);
  const [zoom, setZoom] = useState(1.35);
  const [polar, setPolar] = useState(70);
  const [azimuth, setAzimuth] = useState(50);
  const [unlimited, setUnlimited] = useState(false);
  const [global, setGlobal] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [snap, setSnap] = useState<SnapMode>('soft');
  const [screen, setScreen] = useState('#e4a15a');

  const snapProp = snap === 'off' ? false : snap === 'fast' ? 0.08 : true;
  const azimuthLimit: [number, number] = unlimited
    ? [-Infinity, Infinity]
    : [(-azimuth * Math.PI) / 180, (azimuth * Math.PI) / 180];

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Toggle label="Можно крутить" value={enabled} onChange={setEnabled} />
          <Toggle label="Тянуть по всему кадру" value={global} onChange={setGlobal} />
          <SelectField label="Snap" value={snap} options={snapModes} onChange={setSnap} />
          <Slider
            label="Скорость"
            min={0.3}
            max={3}
            step={0.05}
            value={speed}
            onChange={setSpeed}
          />
          <Slider
            label="Плавность"
            min={0.05}
            max={0.6}
            step={0.01}
            value={damping}
            onChange={setDamping}
          />
          <Slider
            label="Увеличение при тяге"
            min={1}
            max={1.8}
            step={0.05}
            value={zoom}
            onChange={setZoom}
          />
          <Slider
            label="Вертикальный предел, °"
            min={20}
            max={90}
            step={1}
            value={polar}
            onChange={setPolar}
          />
          <Toggle label="Без горизонтального предела" value={unlimited} onChange={setUnlimited} />
          <Slider
            label="Горизонтальный предел, °"
            min={15}
            max={180}
            step={1}
            value={azimuth}
            onChange={setAzimuth}
          />
          <ColorField label="Экран" value={screen} onChange={setScreen} />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <PresentationControls
        enabled={enabled}
        global={global}
        cursor
        snap={snapProp}
        speed={speed}
        damping={damping}
        zoom={zoom}
        polar={[0, (polar * Math.PI) / 180]}
        azimuth={azimuthLimit}
      >
        <group position={[0, 0.15, 0]}>
          <RoundedBox args={[1.7, 2.25, 0.16]} radius={0.1} smoothness={5}>
            <meshStandardMaterial color="#23262e" metalness={0.62} roughness={0.32} />
          </RoundedBox>
          <mesh position={[0, 0.08, 0.09]}>
            <planeGeometry args={[1.42, 1.72]} />
            <meshStandardMaterial
              color={screen}
              emissive={screen}
              emissiveIntensity={0.45}
              roughness={0.42}
            />
          </mesh>
        </group>
      </PresentationControls>
    </ExampleFrame>
  );
}
