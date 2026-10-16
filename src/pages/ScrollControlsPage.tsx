import { Scroll, ScrollControls, useScroll } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useRef, useState } from 'react';
import { Color, type Mesh } from 'three';

import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Slider, Toggle } from '../ui/fields';

const example = getExample('/scroll-controls');

const beats = [
  { title: 'Старт', color: '#e4a15a', kind: 'icosa' },
  { title: 'Подъём', color: '#7eb6ff', kind: 'torus' },
  { title: 'Середина', color: '#ef6d6d', kind: 'knot' },
  { title: 'Спад', color: '#8ddeb5', kind: 'sphere' },
  { title: 'Финал', color: '#d7c4ff', kind: 'cone' },
] as const;

export default function ScrollControlsPage() {
  const [pages, setPages] = useState(4);
  const [damping, setDamping] = useState(0.18);
  const [distance, setDistance] = useState(1);
  const [horizontal, setHorizontal] = useState(false);
  const [infinite, setInfinite] = useState(false);
  const offsetRef = useRef<HTMLSpanElement>(null);
  const pageCount = Math.round(pages);

  return (
    <ExampleFrame
      example={example}
      camera={{ position: [0, 0, 5.2], fov: 45 }}
      hint={
        <>
          {example.hint} offset <span ref={offsetRef}>0.00</span>
        </>
      }
      controls={
        <>
          <Slider label="Страницы" min={2} max={5} step={1} value={pageCount} onChange={setPages} />
          <Slider
            label="Плавность"
            min={0.04}
            max={0.6}
            step={0.01}
            value={damping}
            onChange={setDamping}
          />
          <Slider
            label="Длина страницы"
            min={0.7}
            max={1.6}
            step={0.05}
            value={distance}
            onChange={setDistance}
          />
          <Toggle label="Горизонтально" value={horizontal} onChange={setHorizontal} />
          <Toggle label="Бесконечный цикл" value={infinite} onChange={setInfinite} />
        </>
      }
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={2} />
      <ScrollControls
        key={`${pageCount}-${horizontal}-${distance}-${infinite}`}
        pages={pageCount}
        damping={damping}
        distance={distance}
        horizontal={horizontal}
        infinite={infinite}
        style={{ overscrollBehavior: 'contain' }}
      >
        <OffsetBridge target={offsetRef} />
        <ScrollBackdrop />
        <Scroll>
          {beats.slice(0, pageCount).map((beat, index) => (
            <ScrollObject
              key={beat.title}
              index={index}
              pages={pageCount}
              horizontal={horizontal}
              color={beat.color}
              kind={beat.kind}
            />
          ))}
        </Scroll>
        <Scroll html>
          <Captions pages={pageCount} horizontal={horizontal} />
        </Scroll>
      </ScrollControls>
    </ExampleFrame>
  );
}

function OffsetBridge({ target }: { target: RefObject<HTMLSpanElement | null> }) {
  const scroll = useScroll();
  useFrame(() => {
    if (target.current) target.current.textContent = scroll.offset.toFixed(2);
  });
  return null;
}

function ScrollBackdrop() {
  const scroll = useScroll();
  const from = useRef(new Color('#12141a'));
  const to = useRef(new Color('#2a2218'));
  const mixed = useRef(new Color());

  useFrame(({ scene }) => {
    mixed.current.copy(from.current).lerp(to.current, scroll.offset);
    scene.background = mixed.current;
  });

  return null;
}

function ScrollObject({
  index,
  pages,
  horizontal,
  color,
  kind,
}: {
  index: number;
  pages: number;
  horizontal: boolean;
  color: string;
  kind: (typeof beats)[number]['kind'];
}) {
  const ref = useRef<Mesh>(null);
  const scroll = useScroll();

  useFrame(({ clock, viewport }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const gap = horizontal ? viewport.width : viewport.height;
    const at = pages <= 1 ? 0 : index / (pages - 1);
    const presence = scroll.curve(at - 0.22, 0.44);
    const slide = (presence - 1) * 1.6;
    mesh.position.x = horizontal ? index * gap : slide;
    mesh.position.y = horizontal ? slide * 0.25 : -index * gap;
    mesh.scale.setScalar(0.55 + presence * 0.7);
    mesh.rotation.y = clock.elapsedTime * 0.45 + scroll.offset * Math.PI * 2;
  });

  return (
    <mesh ref={ref}>
      <Shape kind={kind} />
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.32} />
    </mesh>
  );
}

function Shape({ kind }: { kind: (typeof beats)[number]['kind'] }) {
  if (kind === 'icosa') return <icosahedronGeometry args={[0.72, 1]} />;
  if (kind === 'torus') return <torusGeometry args={[0.52, 0.18, 24, 48]} />;
  if (kind === 'knot') return <torusKnotGeometry args={[0.42, 0.14, 120, 16]} />;
  if (kind === 'sphere') return <sphereGeometry args={[0.62, 40, 40]} />;
  return <coneGeometry args={[0.52, 1.05, 28]} />;
}

function Captions({ pages, horizontal }: { pages: number; horizontal: boolean }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  return (
    <>
      {beats.slice(0, pages).map((beat, index) => (
        <div
          key={beat.title}
          className="scroll-caption"
          style={{
            top: horizontal ? 36 : index * height + 36,
            left: horizontal ? index * width + 28 : 28,
          }}
        >
          <span>0{index + 1}</span>
          <strong>{beat.title}</strong>
        </div>
      ))}
    </>
  );
}
