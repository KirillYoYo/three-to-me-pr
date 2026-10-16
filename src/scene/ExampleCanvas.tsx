import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Component, type ReactNode, Suspense, useRef } from 'react';
import { ACESFilmicToneMapping, type Mesh, SRGBColorSpace } from 'three';

export interface CameraConfig {
  position: [number, number, number];
  fov: number;
}

export function ExampleCanvas({
  children,
  camera,
}: {
  children: ReactNode;
  camera?: CameraConfig;
}) {
  return (
    <Canvas
      className="webgl"
      shadows
      dpr={[1, 1.75]}
      camera={camera ?? { position: [3.15, 1.65, 4.35], fov: 42 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
      }}
    >
      <color attach="background" args={['#12141a']} />
      <CanvasErrorBoundary>
        <Suspense fallback={<Pending />}>{children}</Suspense>
      </CanvasErrorBoundary>
    </Canvas>
  );
}

export function StudioLights() {
  return (
    <>
      <hemisphereLight color="#d7e4ff" groundColor="#2a211c" intensity={0.85} />
      <directionalLight position={[4.6, 6.2, 3.1]} intensity={2.3} />
      <directionalLight position={[-3.4, 2.1, -2.2]} intensity={0.45} color="#8eaddf" />
    </>
  );
}

export function Floor({ y = -1.15 }: { y?: number }) {
  return <gridHelper args={[14, 28, '#3c465c', '#232833']} position={[0, y, 0]} />;
}

function Pending() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 1.4;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshBasicMaterial color="#e4a15a" wireframe />
    </mesh>
  );
}

interface BoundaryState {
  message: string | null;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? error.message : 'Сцена не собралась' };
  }

  render() {
    if (this.state.message) {
      return (
        <Html center>
          <div className="load-error">{this.state.message}</div>
        </Html>
      );
    }
    return this.props.children;
  }
}
