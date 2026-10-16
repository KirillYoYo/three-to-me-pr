export const helmetUrl = '/models/DamagedHelmet.glb';
export const bunnyUrl = '/models/stanford-bunny.fbx';
export const fontUrl = '/fonts/Inter.ttf';

export const textures = {
  albedo: '/textures/albedo.png',
  roughness: '/textures/roughness.png',
  normal: '/textures/normal.png',
  poster: '/textures/poster.png',
} as const;

export const environments = [
  { id: 'studio', label: 'Студия', file: '/hdri/studio.hdr' },
  { id: 'sunset', label: 'Закат', file: '/hdri/sunset.hdr' },
  { id: 'night', label: 'Ночь', file: '/hdri/night.hdr' },
  { id: 'warehouse', label: 'Склад', file: '/hdri/warehouse.hdr' },
] as const;

export type EnvironmentId = (typeof environments)[number]['id'];
