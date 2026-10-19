"""Собирает GLB для страницы city-london.

Читает CityJSON, оставляет землю на её высоте и поднимает каждый дом
на отметку рельефа под центром контура. Крыша остаётся плоской:
её Z становится earth + height.
"""

from __future__ import annotations

import json
import struct
import sys
from array import array
from pathlib import Path

import numpy as np

CITY_TYPES = {
    'Building',
    'PlantCover',
    'SolitaryVegetationObject',
    'Road',
    'WaterBody',
    'LandUse',
    'TransportationComplex',
    'TINRelief',
    'ReliefFeature',
    'GenericCityObject',
}
GEOM_TYPES = {'Solid', 'MultiSurface', 'CompositeSurface', 'MultiSolid'}
GROUND_TYPES = {
    'PlantCover',
    'SolitaryVegetationObject',
    'Road',
    'WaterBody',
    'LandUse',
    'TINRelief',
    'ReliefFeature',
}


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else 'scripts/London.json')
    target = Path(sys.argv[2] if len(sys.argv) > 2 else 'public/london/city.glb')
    if not source.is_file():
        fail(f'Нет файла: {source}')

    print(f'Читаю {source.name}', file=sys.stderr)
    objects = parse_cityjson(source)
    print(f'Объектов: {len(objects)}', file=sys.stderr)
    vertices = load_vertices(source)
    print(f'Вершин: {len(vertices)}', file=sys.stderr)

    colors = load_material_colors(source)
    terrain, buildings = split_objects(objects)
    relief = [item for item in terrain if item['type'] == 'ReliefFeature']
    lifts = ground_lifts(buildings, relief or terrain, vertices)
    lifted = int(np.isfinite(lifts).sum())
    print(
        f'Дома: {len(buildings)}, с рельефом: {lifted}, без земли рядом: {len(buildings) - lifted}',
        file=sys.stderr,
    )
    if len(buildings) and lifted == 0:
        fail('Ни один дом не попал на рельеф.')

    finite = lifts[np.isfinite(lifts)]
    if len(finite):
        print(
            f'Подъём домов, м: min {finite.min():.2f}, median {np.median(finite):.2f}, max {finite.max():.2f}',
            file=sys.stderr,
        )

    terrain_mesh = build_mesh(terrain, vertices, colors, lifts=None)
    building_mesh = build_mesh(buildings, vertices, colors, lifts=lifts)
    origin = city_origin(vertices)
    terrain_mesh = swizzle(terrain_mesh, origin)
    building_mesh = swizzle(building_mesh, origin)

    target.parent.mkdir(parents=True, exist_ok=True)
    write_glb(target, [('terrain', terrain_mesh), ('buildings', building_mesh)])
    print(
        f'Записан {target} ({target.stat().st_size / 1_048_576:.1f} МБ)\n'
        f'Треугольники: земля {len(terrain_mesh[2]) // 3}, дома {len(building_mesh[2]) // 3}',
        file=sys.stderr,
    )


def parse_cityjson(path: Path) -> list[dict]:
    objects: list[dict] = []
    current: dict | None = None
    pending_lod = 0.0
    pending_kind = 'MultiSurface'
    brace = 0

    with path.open('rb') as source:
        while True:
            raw = source.readline()
            if not raw:
                break
            line = raw.strip()
            if line.startswith(b'"vertices"'):
                break

            opens = line.count(b'{')
            closes = line.count(b'}')
            if current is None and brace == 2 and line.startswith(b'"') and line.endswith(b'{'):
                current = {
                    'name': line.split(b'"', 2)[1].decode(),
                    'type': '',
                    'height': None,
                    'elevation': None,
                    'geoms': [],
                }
                pending_lod = 0.0
                pending_kind = 'MultiSurface'

            if current is not None and line.startswith(b'"type"'):
                value = line.split(b':', 1)[1].strip().strip(b'",')
                kind = value.decode()
                if kind in GEOM_TYPES:
                    pending_kind = kind
                elif kind in CITY_TYPES or current['type'] == '':
                    current['type'] = kind
            elif current is not None and line.startswith(b'"height"'):
                current['height'] = float(line.split(b':', 1)[1].rstrip(b','))
            elif current is not None and line.startswith(b'"elevation"'):
                current['elevation'] = float(line.split(b':', 1)[1].rstrip(b','))
            elif current is not None and line.startswith(b'"lod"'):
                pending_lod = float(line.split(b':', 1)[1].rstrip(b','))
            elif current is not None and line.startswith(b'"boundaries"'):
                if line.endswith(b'[]'):
                    surfaces = []
                else:
                    surfaces = surfaces_from_boundaries(parse_brackets(source))
                current['geoms'].append(
                    {'lod': pending_lod, 'material': 0, 'surfaces': surfaces}
                )
            elif current is not None and line.startswith(b'"value"') and current['geoms']:
                current['geoms'][-1]['material'] = int(line.split(b':', 1)[1].rstrip(b','))

            brace += opens - closes
            if current is not None and brace <= 2 and closes:
                objects.append(current)
                if len(objects) == 1:
                    surfaces = sum(len(geom['surfaces']) for geom in current['geoms'])
                    print(
                        f'  первый объект {current["name"]} {current["type"]} поверхностей {surfaces}',
                        file=sys.stderr,
                    )
                current = None
            if len(objects) and len(objects) % 2000 == 0 and current is None:
                print(f'  объекты {len(objects)}', file=sys.stderr)

    return objects


def parse_brackets(source) -> list:
    depth = 1
    stack: list[list] = [[]]
    while depth:
        line = source.readline()
        if not line:
            fail('Файл оборвался внутри boundaries')
        token = line.strip().rstrip(b',')
        if token == b'[':
            stack.append([])
            depth += 1
        elif token == b']':
            node = stack.pop()
            depth -= 1
            if depth == 0:
                return node
            stack[-1].append(node)
        elif token:
            stack[-1].append(int(token))
    return []


def surfaces_from_boundaries(node: list) -> list[list[array]]:
    surfaces = []
    for surface in iter_surfaces(node):
        rings = []
        for ring in surface:
            if not ring or isinstance(ring[0], list):
                continue
            cleaned = array('I')
            for index in ring:
                if not cleaned or cleaned[-1] != index:
                    cleaned.append(index)
            if len(cleaned) > 1 and cleaned[0] == cleaned[-1]:
                cleaned.pop()
            if len(cleaned) >= 3:
                rings.append(cleaned)
        if rings:
            surfaces.append(rings)
    return surfaces


def iter_surfaces(node: list):
    if not node:
        return
    if isinstance(node[0], int):
        yield [node]
        return
    if isinstance(node[0][0], int):
        yield node
        return
    if isinstance(node[0][0][0], int):
        yield from node
        return
    for shell in node:
        yield from shell


def load_vertices(path: Path) -> np.ndarray:
    rows: list[tuple[float, float, float]] = []
    with path.open('rb') as source:
        while True:
            line = source.readline()
            if not line:
                fail('В CityJSON нет списка vertices')
            if b'"vertices"' in line:
                break
        coords: list[float] = []
        for raw in source:
            if raw.startswith(b'  ],'):
                break
            token = raw.strip().rstrip(b',')
            if token == b'[':
                coords = []
            elif token == b']':
                if len(coords) == 3:
                    rows.append((coords[0], coords[1], coords[2]))
                coords = []
            elif token:
                coords.append(float(token))
    return np.asarray(rows, dtype=np.float64)


def load_material_colors(path: Path) -> np.ndarray:
    with path.open('rb') as source:
        source.seek(max(0, path.stat().st_size - 20000))
        tail = source.read().decode('utf-8', 'replace')
    start = tail.rfind('"materials"')
    colors = [(255, 255, 255)]
    if start != -1:
        blob = tail[start:]
        end = blob.find(']')
        try:
            materials = json.loads('{' + blob[: end + 1] + '}')['materials']
            colors = [
                tuple(int(round(channel * 255)) for channel in item['diffuseColor'][:3])
                for item in materials
            ]
        except (json.JSONDecodeError, KeyError, TypeError):
            pass
    return np.asarray(colors, dtype=np.uint8)


def split_objects(objects: list[dict]) -> tuple[list[dict], list[dict]]:
    terrain = []
    buildings = []
    for item in objects:
        geoms = item['geoms']
        if not geoms:
            continue
        best = max(geom['lod'] for geom in geoms)
        item['geoms'] = [geom for geom in geoms if geom['lod'] == best]
        if item['type'] == 'Building':
            buildings.append(item)
        elif item['type'] in GROUND_TYPES:
            terrain.append(item)
    return terrain, buildings


def ground_lifts(buildings: list[dict], terrain: list[dict], vertices: np.ndarray) -> np.ndarray:
    import shapely
    from shapely import STRtree
    from shapely.geometry import Polygon

    polygons = []
    heights: list[float] = []
    for item in terrain:
        for geom in item['geoms']:
            for surface in geom['surfaces']:
                if not keep_ground_surface(item, surface, vertices):
                    continue
                ring = surface[0]
                xy = vertices[np.frombuffer(ring, dtype=np.uint32), :2]
                if len(xy) < 3:
                    continue
                polygon = Polygon(xy)
                if polygon.is_empty or polygon.area <= 0:
                    continue
                if not polygon.is_valid:
                    polygon = polygon.buffer(0)
                    if polygon.is_empty or polygon.area <= 0:
                        continue
                polygons.append(polygon)
                heights.append(float(vertices[np.frombuffer(ring, dtype=np.uint32), 2].mean()))
    if not polygons:
        fail('В CityJSON нет полигонов рельефа.')

    print(f'Полигоны земли: {len(polygons)}', file=sys.stderr)
    tree = STRtree(polygons)
    height_arr = np.asarray(heights, dtype=np.float64)
    lifts = np.full(len(buildings), np.nan, dtype=np.float64)
    for index, item in enumerate(buildings):
        ring = ground_ring(item, vertices)
        ids = np.frombuffer(ring, dtype=np.uint32)
        xy = vertices[ids, :2]
        polygon = Polygon(xy)
        probes = []
        if not polygon.is_empty:
            probes.append(polygon.representative_point())
        step = max(1, len(ids) // 8)
        for offset in range(0, len(ids), step):
            probes.append(shapely.Point(float(xy[offset, 0]), float(xy[offset, 1])))
        roof = float(item['height'] or 0.0)
        found: list[float] = []
        for probe in probes:
            hits = tree.query(probe, predicate='intersects')
            if len(hits) == 0:
                continue
            values = height_arr[np.asarray(hits, dtype=int)]
            # Крыша дома тоже лежит в слое рельефа плоским полигоном на z = height.
            # Это не земля под зданием.
            ground = values[np.abs(values - roof) > 1.5]
            if len(ground):
                found.extend(float(value) for value in ground)
        if found:
            lifts[index] = float(np.median(found))
            continue
        nearest = tree.nearest(probes[0] if probes else shapely.Point(float(xy[0, 0]), float(xy[0, 1])))
        nearest_z = float(height_arr[int(nearest)])
        if abs(nearest_z - roof) > 1.5:
            lifts[index] = nearest_z
    return lifts


def keep_ground_surface(item: dict, surface: list[array], vertices: np.ndarray) -> bool:
    if item['type'] != 'ReliefFeature':
        return True
    zz = vertices[np.frombuffer(surface[0], dtype=np.uint32), 2]
    mean = float(zz.mean())
    span = float(zz.max() - zz.min())
    # В слое рельефа вместе с землёй лежат стены и крыши. Земля в этом файле
    # не выше ~30 м и почти горизонтальна.
    if span > 2.5 or mean > 32:
        return False
    elevation = item.get('elevation')
    if elevation is not None and abs(mean - float(elevation)) > 4:
        return False
    return True


def ground_ring(item: dict, vertices: np.ndarray) -> array:
    best: array | None = None
    best_span = -1.0
    for geom in item['geoms']:
        for surface in geom['surfaces']:
            ring = surface[0]
            ids = np.frombuffer(ring, dtype=np.uint32)
            zz = vertices[ids, 2]
            if zz.max() > 0.2:
                continue
            xy = vertices[ids, :2]
            span = float((xy.max(axis=0) - xy.min(axis=0)).sum())
            if span > best_span:
                best = ring
                best_span = span
    if best is None:
        ring = item['geoms'][0]['surfaces'][0][0]
        return ring
    return best


def build_mesh(items: list[dict], vertices: np.ndarray, colors: np.ndarray, lifts: np.ndarray | None):
    positions: list[np.ndarray] = []
    color_rows: list[np.ndarray] = []
    indices: list[np.ndarray] = []
    batch_pos: list[np.ndarray] = []
    batch_col: list[np.ndarray] = []
    batch_idx: list[np.ndarray] = []
    base = 0

    def flush() -> None:
        if not batch_pos:
            return
        positions.append(np.concatenate(batch_pos))
        color_rows.append(np.concatenate(batch_col))
        indices.append(np.concatenate(batch_idx))
        batch_pos.clear()
        batch_col.clear()
        batch_idx.clear()

    for item_index, item in enumerate(items):
        lift = 0.0 if lifts is None else lifts[item_index]
        if lifts is not None and not np.isfinite(lift):
            lift = 0.0
        for geom in item['geoms']:
            color = colors[min(geom['material'], len(colors) - 1)]
            for surface in geom['surfaces']:
                if item['type'] == 'ReliefFeature' and not keep_ground_surface(item, surface, vertices):
                    continue
                flat = np.concatenate([np.frombuffer(ring, dtype=np.uint32) for ring in surface])
                triangles = triangulate(surface, vertices)
                if triangles is None:
                    continue
                xyz = vertices[flat].copy()
                xyz[:, 2] += lift
                batch_pos.append(xyz.astype(np.float32))
                batch_col.append(np.repeat(color.reshape(1, 3), len(flat), axis=0))
                batch_idx.append(triangles + base)
                base += len(flat)
                if len(batch_pos) >= 20000:
                    flush()
    flush()
    if not positions:
        empty_pos = np.zeros((0, 3), np.float32)
        empty_col = np.zeros((0, 3), np.uint8)
        empty_idx = np.zeros(0, np.uint32)
        return empty_pos, empty_col, empty_idx
    return (
        np.concatenate(positions),
        np.concatenate(color_rows),
        np.concatenate(indices).astype(np.uint32),
    )


def triangulate(rings: list[array], vertices: np.ndarray) -> np.ndarray | None:
    import mapbox_earcut

    counts = [len(ring) for ring in rings]
    if counts[0] < 3:
        return None
    if len(rings) == 1 and counts[0] == 3:
        return np.array([0, 1, 2], np.uint32)
    if len(rings) == 1 and counts[0] == 4:
        return np.array([0, 1, 2, 0, 2, 3], np.uint32)
    xy = [vertices[np.frombuffer(ring, dtype=np.uint32), :2] for ring in rings]
    coords = np.concatenate(xy).astype(np.float32)
    ends = np.cumsum(counts, dtype=np.uint32)
    try:
        triangles = mapbox_earcut.triangulate_float32(coords, ends)
    except (ValueError, RuntimeError):
        return None
    if len(triangles) < 3:
        return None
    return np.asarray(triangles, dtype=np.uint32)


def city_origin(vertices: np.ndarray) -> tuple[float, float]:
    return float(vertices[:, 0].mean()), float(vertices[:, 1].mean())


def swizzle(mesh, origin: tuple[float, float]):
    positions, colors, indices = mesh
    if len(positions) == 0:
        return mesh
    out = np.empty_like(positions)
    out[:, 0] = positions[:, 0] - origin[0]
    out[:, 1] = positions[:, 2]
    out[:, 2] = -(positions[:, 1] - origin[1])
    return out, colors, indices


def write_glb(path: Path, meshes: list[tuple[str, tuple]], generator: str = 'cityjson_to_glb') -> None:
    blobs = bytearray()
    views = []
    accessors = []
    primitives = []
    nodes = []
    gltf_meshes = []

    def push(data: bytes, target: int | None) -> int:
        if len(blobs) % 4:
            blobs.extend(b'\x00' * (4 - len(blobs) % 4))
        offset = len(blobs)
        blobs.extend(data)
        view = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data)}
        if target is not None:
            view['target'] = target
        views.append(view)
        return len(views) - 1

    mesh_index = 0
    for name, (positions, colors, indices) in meshes:
        if len(indices) == 0:
            continue
        pos = np.ascontiguousarray(positions, dtype=np.float32)
        col = np.ascontiguousarray(colors, dtype=np.uint8)
        idx = np.ascontiguousarray(indices, dtype=np.uint32)
        pos_view = push(pos.tobytes(), 34962)
        col_view = push(col.tobytes(), 34962)
        idx_view = push(idx.tobytes(), 34963)
        pos_acc = len(accessors)
        accessors.append(
            {
                'bufferView': pos_view,
                'componentType': 5126,
                'count': int(len(pos)),
                'type': 'VEC3',
                'min': pos.min(axis=0).tolist(),
                'max': pos.max(axis=0).tolist(),
            }
        )
        col_acc = len(accessors)
        accessors.append(
            {
                'bufferView': col_view,
                'componentType': 5121,
                'count': int(len(col)),
                'type': 'VEC3',
                'normalized': True,
            }
        )
        idx_acc = len(accessors)
        accessors.append(
            {
                'bufferView': idx_view,
                'componentType': 5125,
                'count': int(len(idx)),
                'type': 'SCALAR',
            }
        )
        gltf_meshes.append(
            {
                'name': name,
                'primitives': [
                    {
                        'attributes': {'POSITION': pos_acc, 'COLOR_0': col_acc},
                        'indices': idx_acc,
                        'material': mesh_index,
                    }
                ],
            }
        )
        nodes.append({'name': name, 'mesh': mesh_index})
        primitives.append(name)
        mesh_index += 1

    document = {
        'asset': {'version': '2.0', 'generator': generator},
        'scene': 0,
        'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes,
        'meshes': gltf_meshes,
        'materials': [
            {
                'name': name,
                'doubleSided': True,
                'pbrMetallicRoughness': {
                    'baseColorFactor': [1, 1, 1, 1],
                    'metallicFactor': 0,
                    'roughnessFactor': 0.92 if name == 'buildings' else 1,
                },
            }
            for name in primitives
        ],
        'accessors': accessors,
        'bufferViews': views,
        'buffers': [{'byteLength': len(blobs)}],
    }
    payload = json.dumps(document, separators=(',', ':')).encode()
    while len(payload) % 4:
        payload += b' '
    while len(blobs) % 4:
        blobs.extend(b'\x00')
    total = 12 + 8 + len(payload) + 8 + len(blobs)
    with path.open('wb') as output:
        output.write(struct.pack('<4sII', b'glTF', 2, total))
        output.write(struct.pack('<I4s', len(payload), b'JSON'))
        output.write(payload)
        output.write(struct.pack('<I4s', len(blobs), b'BIN\x00'))
        output.write(blobs)


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


if __name__ == '__main__':
    main()
