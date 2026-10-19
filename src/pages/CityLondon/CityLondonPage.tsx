import { OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  ACESFilmicToneMapping,
  Box3,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
  Vector3,
  type Object3D,
} from 'three';

import { CityFly, placeInFront } from './CityFly';
import './CityLondon.css';

const MODEL = '/NewYork/city.glb';

function isMesh(object: Object3D): object is Mesh {
  return object instanceof Mesh;
}

interface OrbitLike {
  target: Vector3;
  update: () => void;
  object: {
    position: Vector3;
    getWorldDirection: (target: Vector3) => Vector3;
  };
}

function hasOrbit(value: unknown): value is OrbitLike {
  if (typeof value !== 'object' || value === null) return false;
  if (!('target' in value) || !('update' in value)) return false;
  return typeof value.update === 'function';
}

function City({
  speed,
  flying,
}: {
  speed: MutableRefObject<number>;
  flying: boolean;
}) {
  const { scene } = useGLTF(MODEL);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const fitted = useRef(false);

  useLayoutEffect(() => {
    scene.traverse((object) => {
      if (!isMesh(object)) return;
      if (!object.geometry.getAttribute('normal')) object.geometry.computeVertexNormals();
      if (object.material instanceof MeshStandardMaterial) {
        object.material.side = DoubleSide;
        object.material.vertexColors = true;
        object.material.metalness = 0;
      }
    });
  }, [scene]);

  useLayoutEffect(() => {
    if (fitted.current || flying) return;
    const box = new Box3().setFromObject(scene);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const span = Math.max(size.x, size.z, 1);
    speed.current = Math.max(40, span * 0.08);

    camera.position.set(center.x + span * 0.04, center.y + span * 0.38, center.z + span * 0.58);
    camera.near = Math.max(0.5, span / 4000);
    camera.far = span * 8;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    if (!hasOrbit(controls)) return;
    controls.target.copy(center);
    controls.update();
    fitted.current = true;
  }, [camera, controls, flying, scene, speed]);

  return <primitive object={scene} />;
}

useGLTF.preload(MODEL);

export default function CityLondonPage() {
  const [flying, setFlying] = useState(false);
  const speed = useRef(80);
  const orbit = useRef<OrbitControlsImpl>(null);
  const root = useRef<HTMLDivElement>(null);
  const wasFlying = useRef(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'KeyF' || event.repeat) return;
      setFlying((value) => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (flying) {
      wasFlying.current = true;
      return;
    }
    if (!wasFlying.current || !orbit.current) return;
    wasFlying.current = false;
    orbit.current.target.copy(placeInFront(orbit.current.object, speed.current));
    orbit.current.update();
  }, [flying]);

  return (
    <div className="city-london" ref={root}>
      <Canvas
        className="city-canvas"
        dpr={[1, 1.5]}
        camera={{ position: [0, 700, 1100], fov: 45, near: 0.5, far: 20000 }}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#a9c0d4']} />
        <hemisphereLight color="#f4f7fb" groundColor="#6d7a62" intensity={1.2} />
        <directionalLight position={[900, 1600, 500]} intensity={1.7} />
        <Suspense fallback={null}>
          <City speed={speed} flying={flying} />
        </Suspense>
        <CityFly enabled={flying} speed={speed} />
        <OrbitControls
          ref={orbit}
          makeDefault
          enabled={!flying}
          enableDamping
          maxPolarAngle={Math.PI}
        />
      </Canvas>
      <div className="city-hud">
        <button
          type="button"
          className="city-fly"
          onClick={() => {
            const canvas = root.current?.querySelector('canvas');
            if (!flying && canvas instanceof HTMLCanvasElement) void canvas.requestPointerLock();
            setFlying((value) => !value);
          }}
        >
          {flying ? 'Обзор' : 'Полёт'}
        </button>
        <p className="city-note">
          {flying
            ? 'Щёлкни по сцене, чтобы мышь смотрела. W и S летят туда, куда смотришь, A и D — вбок, Q и E — вверх и вниз, Shift — быстрее, Esc — отпустить мышь, F — обратно к обзору.'
            : 'Тяни мышь, чтобы осмотреться. Двойной щелчок ставит камеру в это место. F или кнопка — свободный полёт.'}
        </p>
      </div>
    </div>
  );
}
