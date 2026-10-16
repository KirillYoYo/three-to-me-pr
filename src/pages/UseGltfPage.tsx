import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { useState } from 'react';

import { helmetUrl } from '../assets';
import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { FittedModel } from '../scene/FittedModel';
import { Slider, Toggle } from '../ui/fields';

const example = getExample('/use-gltf');

export default function UseGltfPage() {
  const [scale, setScale] = useState(1);
  const [spin, setSpin] = useState(0.35);
  const [wireframe, setWireframe] = useState(false);
  const [showEnv, setShowEnv] = useState(true);
  const [envIntensity, setEnvIntensity] = useState(1);

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
          <Toggle label="Каркас" value={wireframe} onChange={setWireframe} />
          <Toggle label="Окружение" value={showEnv} onChange={setShowEnv} />
          <Slider
            label="Сила окружения"
            min={0}
            max={3}
            step={0.05}
            value={envIntensity}
            onChange={setEnvIntensity}
          />
        </>
      }
    >
      <StudioLights />
      <Floor y={-1.05} />
      {showEnv ? (
        <Environment files="/hdri/studio.hdr" environmentIntensity={envIntensity} />
      ) : null}
      <Helmet scale={scale} spin={spin} wireframe={wireframe} />
      <OrbitControls makeDefault target={[0, 0, 0]} enableDamping />
    </ExampleFrame>
  );
}

function Helmet({ scale, spin, wireframe }: { scale: number; spin: number; wireframe: boolean }) {
  const gltf = useGLTF(helmetUrl);
  return <FittedModel source={gltf.scene} scale={scale} spin={spin} wireframe={wireframe} />;
}

useGLTF.preload(helmetUrl);
