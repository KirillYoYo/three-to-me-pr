import { ExampleCanvas, Floor, StudioLights } from '../../scene/ExampleCanvas.tsx';
import { OrbitControls } from '@react-three/drei';
import { BigBen } from './bigBen.tsx';

const LondonPage = ({children}: {children?: any}) => {



  return (
    <div style={{height:'100%', width:'100%', position:'absolute', top: 0}}>
      <ExampleCanvas camera={{position: [0, 1.35, 6.2], fov: 42}}>
        {children}
        <StudioLights />
        <Floor />
        <OrbitControls makeDefault enableDamping enableRotate={false} enablePan={false} />
        <BigBen position={[0, 0, 0]} scale={0.02} />
      </ExampleCanvas>
    </div>
  );
};

export default LondonPage;
