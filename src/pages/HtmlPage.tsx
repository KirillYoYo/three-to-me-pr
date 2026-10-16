import { Html, OrbitControls } from '@react-three/drei';
import { useState } from 'react';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { Slider, Toggle } from '../ui/fields';

const example = getExample('/html');

const anchors = [
  { name: 'Латунь', color: '#e4a15a', position: [-1.35, 0.2, 0.4] as const },
  { name: 'Стекло', color: '#7eb6ff', position: [1.25, 0.35, -0.2] as const },
  { name: 'Коралл', color: '#ef6d6d', position: [0.1, -0.15, 1.15] as const },
];

export default function HtmlPage() {
  const [distanceFactor, setDistanceFactor] = useState(6);
  const [transform, setTransform] = useState(false);
  const [sprite, setSprite] = useState(false);
  const [occlude, setOcclude] = useState(true);
  const [clicks, setClicks] = useState(0);

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider
            label="Масштаб подписи"
            min={2}
            max={14}
            step={0.1}
            value={distanceFactor}
            onChange={setDistanceFactor}
          />
          <Toggle label="Как 3D-плоскость" value={transform} onChange={setTransform} />
          <Toggle label="Всегда лицом к камере" value={sprite} onChange={setSprite} />
          <Toggle label="Прятать за объектами" value={occlude} onChange={setOcclude} />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <mesh rotation={[Math.PI / 2.4, 0.2, 0]}>
        <torusGeometry args={[1.15, 0.28, 24, 64]} />
        <meshStandardMaterial color="#d7deea" metalness={0.7} roughness={0.25} />
      </mesh>
      {anchors.map((anchor) => (
        <group key={anchor.name} position={anchor.position}>
          <mesh>
            <sphereGeometry args={[0.34, 32, 32]} />
            <meshStandardMaterial color={anchor.color} metalness={0.25} roughness={0.35} />
          </mesh>
          <Html
            position={[0, 0.62, 0]}
            center
            distanceFactor={distanceFactor}
            transform={transform}
            sprite={sprite}
            occlude={occlude}
          >
            <div className="anchor-label">
              <strong>{anchor.name}</strong>
              {anchor.name === 'Стекло' ? (
                <button
                  type="button"
                  onClick={() => {
                    setClicks((value) => value + 1);
                  }}
                >
                  клики: {clicks}
                </button>
              ) : (
                <span>HTML-узел</span>
              )}
            </div>
          </Html>
        </group>
      ))}
      <OrbitControls makeDefault enableDamping />
    </ExampleFrame>
  );
}
