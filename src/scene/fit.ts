import {
  Box3,
  type BufferGeometry,
  Group,
  type Material,
  Mesh,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three';

export function isMesh(object: Object3D): object is Mesh<BufferGeometry, Material | Material[]> {
  return object instanceof Mesh;
}

export function fitClone(source: Object3D, targetSize = 1.75) {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!isMesh(child)) return;
    const material = child.material;
    child.material = Array.isArray(material)
      ? material.map((item) => item.clone())
      : material.clone();
  });

  const box = new Box3().setFromObject(clone);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  clone.position.sub(center);

  const max = Math.max(size.x, size.y, size.z) || 1;
  const group = new Group();
  group.add(clone);
  group.scale.setScalar(targetSize / max);
  return group;
}

export function disposeMaterials(root: Object3D) {
  const materials = new Set<Material>();
  root.traverse((child) => {
    if (!isMesh(child)) return;
    const material = child.material;
    const list = Array.isArray(material) ? material : [material];
    for (const item of list) materials.add(item);
  });
  for (const material of materials) material.dispose();
}

export function paintMaterial(material: Material, wireframe: boolean, color?: string) {
  if (hasWireframe(material)) material.wireframe = wireframe;
  material.needsUpdate = true;
  if (!color) return;
  if (
    material instanceof MeshStandardMaterial ||
    material instanceof MeshPhongMaterial ||
    material instanceof MeshLambertMaterial
  ) {
    material.color.set(color);
  }
}

function hasWireframe(material: Material): material is Material & { wireframe: boolean } {
  return 'wireframe' in material;
}
