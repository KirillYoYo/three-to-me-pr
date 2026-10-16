import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { Shell } from './app/Shell';

const OrbitControlsPage = lazy(() => import('./pages/OrbitControlsPage'));
const ScrollControlsPage = lazy(() => import('./pages/ScrollControlsPage'));
const PresentationControlsPage = lazy(() => import('./pages/PresentationControlsPage'));
const UseGltfPage = lazy(() => import('./pages/UseGltfPage'));
const UseTexturePage = lazy(() => import('./pages/UseTexturePage'));
const UseFbxPage = lazy(() => import('./pages/UseFbxPage'));
const TextPage = lazy(() => import('./pages/TextPage'));
const ImagePage = lazy(() => import('./pages/ImagePage'));
const HtmlPage = lazy(() => import('./pages/HtmlPage'));
const EnvironmentPage = lazy(() => import('./pages/EnvironmentPage'));
const MeshWobblePage = lazy(() => import('./pages/MeshWobblePage'));
const MeshDistortPage = lazy(() => import('./pages/MeshDistortPage'));
const MeshTransmissionPage = lazy(() => import('./pages/MeshTransmissionPage'));

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="/orbit-controls" replace />} />
        <Route path="orbit-controls" element={<OrbitControlsPage />} />
        <Route path="scroll-controls" element={<ScrollControlsPage />} />
        <Route path="presentation-controls" element={<PresentationControlsPage />} />
        <Route path="use-gltf" element={<UseGltfPage />} />
        <Route path="use-texture" element={<UseTexturePage />} />
        <Route path="use-fbx" element={<UseFbxPage />} />
        <Route path="text" element={<TextPage />} />
        <Route path="image" element={<ImagePage />} />
        <Route path="html" element={<HtmlPage />} />
        <Route path="environment" element={<EnvironmentPage />} />
        <Route path="mesh-wobble" element={<MeshWobblePage />} />
        <Route path="mesh-distort" element={<MeshDistortPage />} />
        <Route path="mesh-transmission" element={<MeshTransmissionPage />} />
        <Route path="*" element={<Navigate to="/orbit-controls" replace />} />
      </Route>
    </Routes>
  );
}
