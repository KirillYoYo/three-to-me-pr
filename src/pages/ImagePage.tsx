import { Image, OrbitControls, useTexture } from '@react-three/drei';
import { useLayoutEffect, useState } from 'react';
import { SRGBColorSpace } from 'three';

import { textures } from '../assets';
import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { ColorField, Slider, Toggle } from '../ui/fields';

const example = getExample('/image');

export default function ImagePage() {
  const [zoom, setZoom] = useState(1);
  const [radius, setRadius] = useState(0.12);
  const [grayscale, setGrayscale] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [width, setWidth] = useState(2.15);
  const [toneMapped, setToneMapped] = useState(false);
  const [color, setColor] = useState('#ffffff');

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <Slider label="Zoom" min={0.6} max={2.6} step={0.05} value={zoom} onChange={setZoom} />
          <Slider
            label="Скругление"
            min={0}
            max={0.8}
            step={0.01}
            value={radius}
            onChange={setRadius}
          />
          <Slider
            label="Ч/б"
            min={0}
            max={1}
            step={0.01}
            value={grayscale}
            onChange={setGrayscale}
          />
          <Slider
            label="Прозрачность"
            min={0.15}
            max={1}
            step={0.01}
            value={opacity}
            onChange={setOpacity}
          />
          <Slider
            label="Ширина"
            min={1.2}
            max={3.4}
            step={0.05}
            value={width}
            onChange={setWidth}
          />
          <Toggle label="Тонмаппинг" value={toneMapped} onChange={setToneMapped} />
          <ColorField label="Оттенок" value={color} onChange={setColor} />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <Poster
        zoom={zoom}
        radius={radius}
        grayscale={grayscale}
        opacity={opacity}
        width={width}
        toneMapped={toneMapped}
        color={color}
      />
      <OrbitControls makeDefault enableDamping />
    </ExampleFrame>
  );
}

function Poster({
  zoom,
  radius,
  grayscale,
  opacity,
  width,
  toneMapped,
  color,
}: {
  zoom: number;
  radius: number;
  grayscale: number;
  opacity: number;
  width: number;
  toneMapped: boolean;
  color: string;
}) {
  const texture = useTexture(textures.poster);
  const height = width * 1.15;
  const transparent = opacity < 1 || radius > 0;

  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <>
      <mesh position={[0, 0.05, -0.08]}>
        <boxGeometry args={[width + 0.18, height + 0.18, 0.05]} />
        <meshStandardMaterial color="#1c212b" metalness={0.45} roughness={0.4} />
      </mesh>
      <Image
        texture={texture}
        position={[0, 0.05, 0]}
        scale={[width, height]}
        zoom={zoom}
        radius={radius}
        grayscale={grayscale}
        opacity={opacity}
        transparent={transparent}
        toneMapped={toneMapped}
        color={color}
        segments={32}
      />
    </>
  );
}

useTexture.preload(textures.poster);
