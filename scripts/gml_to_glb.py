"""Собирает GLB из CityGML.

Читает файл потоком, поэтому подходит и для больших тайлов. Координаты
остаются как в файле и только сдвигаются к центру, чтобы сцена влезла
в float32. Ось Z становится осью Y.

Если в файле есть рельеф (TIN / ReliefFeature), плоские объекты сажаются
на него:

- у объёма с ровным основанием (дом) весь блок поднимается на высоту земли
  под центром контура, крыша остаётся плоской;
- у плоского контура с measuredHeight (дерево) низ ложится на рельеф,
  верх — на рельеф плюс эта высота;
- дороги, вода и участки без высоты повторяют рельеф по вершинам.

Без рельефа геометрия пишется как есть.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

MEMBERS = {'cityObjectMember', 'featureMember'}
SURFACES = {'Polygon', 'Triangle', 'TrianglePatch', 'Rectangle'}
RELIEF = {'ReliefFeature', 'TINRelief'}
VOLUME_KINDS = {'Building', 'BuildingPart', 'BuildingInstallation'}

COLORS = {
    'building': np.array([222, 218, 210], np.uint8),
    'water': np.array([64, 136, 186], np.uint8),
    'road': np.array([148, 148, 148], np.uint8),
    'vegetation': np.array([86, 146, 78], np.uint8),
    'terrain': np.array([186, 186, 178], np.uint8),
}


def main() -> None:
    args = parse_args()
    source = args.gml.expanduser().resolve()
    target = args.output.expanduser().resolve() if args.output else source.with_suffix('.glb')
    if not source.is_file():
        fail(f'Нет файла: {source}')
    if source.suffix.lower() not in {'.gml', '.xml', '.citygml'}:
        print(f'Расширение {source.suffix} необычное для CityGML, всё равно читаю.', file=sys.stderr)

    print(f'Читаю {source.name}', file=sys.stderr)
    terrain, objects, grid = parse_gml(source, args.cell_size)
    print(
        f'Рельеф: {grid.count} ячеек, объектов кроме рельефа: {len(objects)}',
        file=sys.stderr,
    )

    buildings = Mesh()
    ground = Mesh()
    ground.extend(terrain)
    lifted = draped = extruded = raw = 0
    for item in objects:
        kind = classify(item['kind'])
        if grid.count and not args.no_drape and is_volume(item):
            if lift_volume(item, grid):
                lifted += 1
            else:
                raw += 1
            add_surfaces(buildings, item['surfaces'], COLORS[kind])
        elif grid.count and not args.no_drape and item['height'] and item['height'] > 0.2:
            add_extrusion(buildings, item, grid, COLORS['vegetation' if kind == 'vegetation' else kind])
            extruded += 1
        elif grid.count and not args.no_drape and is_flat(item):
            drape_surfaces(item, grid)
            add_surfaces(ground, item['surfaces'], COLORS[kind])
            draped += 1
        else:
            target_mesh = buildings if kind == 'building' else ground
            add_surfaces(target_mesh, item['surfaces'], COLORS[kind])
            raw += 1

    print(
        f'Поднято объёмов: {lifted}, вытянуто по measuredHeight: {extruded}, '
        f'положено на рельеф: {draped}, без сдвига: {raw}',
        file=sys.stderr,
    )
    terrain_mesh = ground.finish()
    building_mesh = buildings.finish()
    if len(terrain_mesh[2]) == 0 and len(building_mesh[2]) == 0:
        fail('В GML не нашлось полигонов.')

    origin = mesh_origin(terrain_mesh, building_mesh)
    from cityjson_to_glb import swizzle, write_glb

    target.parent.mkdir(parents=True, exist_ok=True)
    write_glb(
        target,
        [('terrain', swizzle(terrain_mesh, origin)), ('buildings', swizzle(building_mesh, origin))],
        generator='gml_to_glb',
    )
    print(
        f'Записан {target} ({target.stat().st_size / 1_048_576:.1f} МБ)\n'
        f'Треугольники: земля {len(terrain_mesh[2]) // 3}, объёмы {len(building_mesh[2]) // 3}',
        file=sys.stderr,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Собирает GLB из CityGML, сажая объекты на рельеф, если он есть.')
    parser.add_argument('gml', type=Path, help='Файл CityGML: .gml, .xml или .citygml')
    parser.add_argument('-o', '--output', type=Path, help='Куда записать .glb. По умолчанию рядом с GML')
    parser.add_argument('--cell-size', type=float, default=2.0, help='Шаг сетки высот рельефа, метры')
    parser.add_argument(
        '--no-drape',
        action='store_true',
        help='Не сажать объекты на рельеф, записать геометрию как в файле',
    )
    args = parser.parse_args()
    if args.cell_size <= 0:
        fail('--cell-size должен быть больше нуля')
    return args


def parse_gml(path: Path, cell_size: float):
    try:
        from lxml import etree
    except ImportError:
        fail('Нужен пакет lxml.\nУстанови его: pip install -r scripts/requirements.txt')

    grid = HeightGrid(cell_size)
    terrain = Mesh()
    objects: list[dict] = []
    current: dict | None = None
    surface: list[np.ndarray] | None = None
    relief_depth: int | None = None
    stack: list[str] = []
    members = 0
    relief_triangles = 0

    context = etree.iterparse(path, events=('start', 'end'), huge_tree=True)
    for event, elem in context:
        name = local_name(elem.tag)
        if event == 'start':
            stack.append(name)
            if name in MEMBERS:
                current = {'kind': '', 'surfaces': [], 'height': None}
                surface = None
            elif current is not None and not current['kind'] and name not in SURFACES | MEMBERS:
                current['kind'] = name
            if name in RELIEF:
                relief_depth = len(stack)
                print('  рельеф: читаю треугольники земли, это самый долгий кусок', file=sys.stderr)
            if name in SURFACES:
                surface = []
            continue

        if name == 'posList' and elem.text and surface is not None:
            ring = parse_pos_list(elem)
            if ring is not None:
                surface.append(ring)
        elif name == 'measuredHeight' and current is not None and elem.text:
            try:
                current['height'] = float(elem.text.strip())
            except ValueError:
                pass
        elif name in SURFACES and surface:
            if relief_depth is not None:
                add_surfaces(terrain, [surface], COLORS['terrain'])
                for ring in surface:
                    grid.add_ring(ring)
                relief_triangles += 1
                if relief_triangles % 250_000 == 0:
                    print(f'  рельеф: {relief_triangles} треугольников, ячеек {grid.count}', file=sys.stderr)
            elif current is not None:
                current['surfaces'].append(surface)
            surface = None
            release(elem)
        elif name in MEMBERS:
            if current is not None and current['surfaces'] and relief_depth is None:
                objects.append(current)
            current = None
            surface = None
            members += 1
            if members % 2000 == 0:
                print(f'  объекты {members}, ячеек рельефа {grid.count}', file=sys.stderr)
            release(elem)
        elif name in RELIEF:
            relief_depth = None
            release(elem)

        if stack:
            stack.pop()

    print(f'  объекты {members}', file=sys.stderr)
    return terrain, objects, grid


def local_name(tag: str) -> str:
    return tag.rsplit('}', 1)[-1]


def parse_pos_list(elem) -> np.ndarray | None:
    values = np.fromstring(elem.text, sep=' ', dtype=np.float64)
    if values.size < 6:
        return None
    dimension = int(elem.attrib.get('srsDimension', '0') or '0')
    if dimension not in (2, 3):
        dimension = 3 if values.size % 3 == 0 else 2
    count = values.size // dimension
    values = values[: count * dimension]
    if dimension == 2:
        xyz = np.column_stack((values[0::2], values[1::2], np.zeros(count)))
    else:
        xyz = values.reshape(-1, 3)
    if len(xyz) >= 2 and np.allclose(xyz[0], xyz[-1]):
        xyz = xyz[:-1]
    if len(xyz) < 3:
        return None
    return xyz.astype(np.float32)


def release(elem) -> None:
    parent = elem.getparent()
    elem.clear()
    if parent is None:
        return
    while elem.getprevious() is not None:
        del parent[0]


class HeightGrid:
    def __init__(self, cell: float) -> None:
        self.cell = cell
        self.z: dict[tuple[int, int], float] = {}

    @property
    def count(self) -> int:
        return len(self.z)

    def add_ring(self, ring: np.ndarray) -> None:
        if len(ring) == 3 or (len(ring) == 4 and np.allclose(ring[0], ring[-1])):
            self.add_triangle(ring[:3])
            return
        indices = triangle_indices([ring])
        if indices is None:
            return
        for offset in range(0, len(indices), 3):
            self.add_triangle(ring[indices[offset : offset + 3]])

    def add_triangle(self, triangle: np.ndarray) -> None:
        span = float(triangle[:, 2].max() - triangle[:, 2].min())
        flat = float(np.hypot(*(triangle[:, :2].max(axis=0) - triangle[:, :2].min(axis=0))))
        if span > 4 and span > flat:
            return
        mins = triangle[:, :2].min(axis=0)
        maxs = triangle[:, :2].max(axis=0)
        ix0, iy0 = self._cell(float(mins[0]), float(mins[1]))
        ix1, iy1 = self._cell(float(maxs[0]), float(maxs[1]))
        if (ix1 - ix0 + 1) * (iy1 - iy0 + 1) > 400:
            for point in triangle:
                self._write(self._cell(float(point[0]), float(point[1])), float(point[2]))
            return
        for ix in range(ix0, ix1 + 1):
            for iy in range(iy0, iy1 + 1):
                x = (ix + 0.5) * self.cell
                y = (iy + 0.5) * self.cell
                height = barycentric_z(x, y, triangle)
                if height is not None:
                    self._write((ix, iy), height)

    def sample(self, x: float, y: float) -> float | None:
        ix, iy = self._cell(x, y)
        best = None
        best_distance = 1e30
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                height = self.z.get((ix + dx, iy + dy))
                if height is None:
                    continue
                cx = (ix + dx + 0.5) * self.cell
                cy = (iy + dy + 0.5) * self.cell
                distance = (cx - x) ** 2 + (cy - y) ** 2
                if distance < best_distance:
                    best_distance = distance
                    best = height
        if best is None or best_distance > (self.cell * 6) ** 2:
            return None
        return best

    def _cell(self, x: float, y: float) -> tuple[int, int]:
        return int(np.floor(x / self.cell)), int(np.floor(y / self.cell))

    def _write(self, key: tuple[int, int], height: float) -> None:
        previous = self.z.get(key)
        if previous is None or abs(height) >= 0.3 or abs(previous) < 0.3:
            self.z[key] = height


def barycentric_z(x: float, y: float, triangle: np.ndarray) -> float | None:
    ax, ay, az = (float(value) for value in triangle[0])
    bx, by, bz = (float(value) for value in triangle[1])
    cx, cy, cz = (float(value) for value in triangle[2])
    v0x, v0y = cx - ax, cy - ay
    v1x, v1y = bx - ax, by - ay
    v2x, v2y = x - ax, y - ay
    dot00 = v0x * v0x + v0y * v0y
    dot01 = v0x * v1x + v0y * v1y
    dot02 = v0x * v2x + v0y * v2y
    dot11 = v1x * v1x + v1y * v1y
    dot12 = v1x * v2x + v1y * v2y
    denom = dot00 * dot11 - dot01 * dot01
    if abs(denom) < 1e-12:
        return None
    u = (dot11 * dot02 - dot01 * dot12) / denom
    v = (dot00 * dot12 - dot01 * dot02) / denom
    if u < -1e-4 or v < -1e-4 or u + v > 1 + 1e-4:
        return None
    return az + u * (cz - az) + v * (bz - az)


class Mesh:
    def __init__(self) -> None:
        self._pos: list[np.ndarray] = []
        self._col: list[np.ndarray] = []
        self._idx: list[np.ndarray] = []
        self._batch_pos: list[np.ndarray] = []
        self._batch_col: list[np.ndarray] = []
        self._batch_idx: list[np.ndarray] = []
        self._base = 0

    def extend(self, other: Mesh) -> None:
        other._flush()
        self._flush()
        self._pos.extend(other._pos)
        self._col.extend(other._col)
        self._idx.extend(other._idx)
        if other._idx:
            self._base = int(other._idx[-1].max()) + 1 if len(other._idx[-1]) else self._base

    def add(self, positions: np.ndarray, indices: np.ndarray, color: np.ndarray) -> None:
        if len(indices) == 0:
            return
        self._batch_pos.append(positions.astype(np.float32, copy=False))
        self._batch_col.append(np.repeat(color.reshape(1, 3), len(positions), axis=0))
        self._batch_idx.append(indices.astype(np.uint32) + self._base)
        self._base += len(positions)
        if len(self._batch_pos) >= 8000:
            self._flush()

    def finish(self):
        self._flush()
        if not self._pos:
            return (
                np.zeros((0, 3), np.float32),
                np.zeros((0, 3), np.uint8),
                np.zeros(0, np.uint32),
            )
        return np.concatenate(self._pos), np.concatenate(self._col), np.concatenate(self._idx)

    def _flush(self) -> None:
        if not self._batch_pos:
            return
        self._pos.append(np.concatenate(self._batch_pos))
        self._col.append(np.concatenate(self._batch_col))
        self._idx.append(np.concatenate(self._batch_idx))
        self._batch_pos.clear()
        self._batch_col.clear()
        self._batch_idx.clear()


def classify(kind: str) -> str:
    if kind in VOLUME_KINDS or kind.startswith('Building'):
        return 'building'
    if 'Water' in kind:
        return 'water'
    if kind in {'Road', 'Railway', 'Square', 'Track', 'TransportationComplex', 'TrafficArea', 'AuxiliaryTrafficArea'}:
        return 'road'
    if 'Vegetation' in kind or 'Plant' in kind or kind in {'SolitaryVegetationObject', 'PlantCover'}:
        return 'vegetation'
    return 'terrain'


def is_volume(item: dict) -> bool:
    zs = [float(ring[:, 2].max() - ring[:, 2].min()) for surface in item['surfaces'] for ring in surface]
    if not zs:
        return False
    points = np.concatenate([ring[:, 2] for surface in item['surfaces'] for ring in surface])
    return float(points.max() - points.min()) > 1


def is_flat(item: dict) -> bool:
    points = np.concatenate([ring[:, 2] for surface in item['surfaces'] for ring in surface])
    return float(points.max() - points.min()) <= 0.4


def lift_volume(item: dict, grid: HeightGrid) -> bool:
    points = np.concatenate([ring for surface in item['surfaces'] for ring in surface])
    base = float(points[:, 2].min())
    footprint = points[points[:, 2] <= base + 0.35]
    if len(footprint) < 3:
        return False
    if float(footprint[:, 2].max() - footprint[:, 2].min()) > 0.4:
        return False
    center = footprint[:, :2].mean(axis=0)
    ground = grid.sample(float(center[0]), float(center[1]))
    if ground is None:
        return False
    delta = np.float32(ground - base)
    if abs(float(delta)) < 1e-3:
        return True
    for surface in item['surfaces']:
        for ring in surface:
            ring[:, 2] += delta
    return True


def drape_surfaces(item: dict, grid: HeightGrid) -> None:
    for surface in item['surfaces']:
        for ring in surface:
            for point in ring:
                ground = grid.sample(float(point[0]), float(point[1]))
                if ground is not None:
                    point[2] = np.float32(ground)


def add_extrusion(mesh: Mesh, item: dict, grid: HeightGrid, color: np.ndarray) -> None:
    for surface in item['surfaces']:
        draped = []
        for ring in surface:
            copy = ring.copy()
            for point in copy:
                ground = grid.sample(float(point[0]), float(point[1]))
                if ground is not None:
                    point[2] = np.float32(ground)
            draped.append(copy)
        indices = triangle_indices(draped)
        if indices is None:
            continue
        flat = np.concatenate(draped)
        roof = flat.copy()
        roof[:, 2] += np.float32(item['height'])
        mesh.add(flat, indices, color)
        mesh.add(roof, indices, color)
        wall_pos = []
        wall_idx = []
        cursor = 0
        for ring in draped:
            count = len(ring)
            for index in range(count):
                nxt = (index + 1) % count
                a = ring[index]
                b = ring[nxt]
                base_index = len(wall_pos)
                wall_pos.extend((a, b, b.copy(), a.copy()))
                wall_pos[base_index + 2][2] = b[2] + item['height']
                wall_pos[base_index + 3][2] = a[2] + item['height']
                wall_idx.extend((base_index, base_index + 1, base_index + 2, base_index, base_index + 2, base_index + 3))
            cursor += count
        if wall_pos:
            mesh.add(np.vstack(wall_pos), np.asarray(wall_idx, np.uint32), color)


def add_surfaces(mesh: Mesh, surfaces: list[list[np.ndarray]], color: np.ndarray) -> None:
    for surface in surfaces:
        indices = triangle_indices(surface)
        if indices is None:
            continue
        mesh.add(np.concatenate(surface), indices, color)


def triangle_indices(rings: list[np.ndarray]) -> np.ndarray | None:
    import mapbox_earcut

    counts = [len(ring) for ring in rings if len(ring) >= 3]
    rings = [ring for ring in rings if len(ring) >= 3]
    if not rings:
        return None
    if len(rings) == 1 and counts[0] == 3:
        return np.array([0, 1, 2], np.uint32)
    if len(rings) == 1 and counts[0] == 4:
        return np.array([0, 1, 2, 0, 2, 3], np.uint32)
    coords = np.concatenate([ring[:, :2] for ring in rings]).astype(np.float32)
    ends = np.cumsum(counts, dtype=np.uint32)
    try:
        indices = mapbox_earcut.triangulate_float32(coords, ends)
    except (ValueError, RuntimeError):
        return None
    if len(indices) < 3:
        return None
    return np.asarray(indices, dtype=np.uint32)


def mesh_origin(*meshes) -> tuple[float, float]:
    total = 0
    sx = 0.0
    sy = 0.0
    for positions, _, _ in meshes:
        if len(positions) == 0:
            continue
        sx += float(positions[:, 0].sum())
        sy += float(positions[:, 1].sum())
        total += len(positions)
    if total == 0:
        return 0.0, 0.0
    return sx / total, sy / total


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


if __name__ == '__main__':
    main()
