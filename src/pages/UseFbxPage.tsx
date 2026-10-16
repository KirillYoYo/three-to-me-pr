import { OrbitControls, useFBX } from '@react-three/drei';
import { useState } from 'react';

import { bunnyUrl } from '../assets';
import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { FittedModel } from '../scene/FittedModel';
import { ColorField, Slider, Toggle } from '../ui/fields';

const example = getExample('/use-fbx');

export default function UseFbxPage() {
  const [scale, setScale] = useState(1);
  const [spin, setSpin] = useState(0.4);
  const [rotationX, setRotationX] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [color, setColor] = useState('#f4efe6');

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider
            label="Масштаб"
            min={0.6}
            max={1.8}
            step={0.05}
            value={scale}
            onChange={setScale}
          />
          <Slider label="Вращение" min={0} max={2} step={0.05} value={spin} onChange={setSpin} />
          <Slider
            label="Поворот X, °"
            min={-180}
            max={180}
            step={1}
            value={rotationX}
            onChange={setRotationX}
          />
          <Toggle label="Каркас" value={wireframe} onChange={setWireframe} />
          <ColorField label="Цвет" value={color} onChange={setColor} />
        </>
      }
    >
      <StudioLights />
      <Floor y={-1.05} />
      <Bunny
        scale={scale}
        spin={spin}
        rotationX={(rotationX * Math.PI) / 180}
        wireframe={wireframe}
        color={color}
      />
      <OrbitControls makeDefault enableDamping />
    </ExampleFrame>
  );
}

function Bunny({
  scale,
  spin,
  rotationX,
  wireframe,
  color,
}: {
  scale: number;
  spin: number;
  rotationX: number;
  wireframe: boolean;
  color: string;
}) {
  const model = useFBX(bunnyUrl);
  return (
    <FittedModel
      source={model}
      scale={scale}
      spin={spin}
      rotationX={rotationX}
      wireframe={wireframe}
      color={color}
    />
  );
}

useFBX.preload(bunnyUrl);
