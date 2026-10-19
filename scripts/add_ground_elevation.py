"""Добавляет зданиям GlobalBuildingAtlas LoD1 отметку земли из DEM.

Высота самого здания (колонка height) не меняется. К зданию добавляется
высота местности в точке, где оно стоит:

- ground_elevation — отметка земли из DEM, метры;
- roof_elevation — ground_elevation + height;
- Z каждой вершины контура — ground_elevation, низ блока лежит на рельефе.
"""

from __future__ import annotations

import argparse
import sys
import warnings
from pathlib import Path

import numpy as np

BUILDING_SUFFIXES = {'.parquet', '.geoparquet', '.geojson', '.json', '.gpkg'}
HEIGHT_CANDIDATES = ('height', 'Height', 'building_height', 'gba_height')
DEM_MEMORY_LIMIT = 512 * 1024 * 1024


def main() -> None:
    require_dependencies()
    args = parse_args()
    buildings_path = args.buildings.expanduser().resolve()
    dem_path = args.dem.expanduser().resolve()
    output_path = args.output.expanduser().resolve()

    if not buildings_path.is_file():
        fail(f'Нет файла зданий: {buildings_path}')
    if not dem_path.is_file():
        fail(f'Нет файла DEM: {dem_path}')
    if buildings_path.suffix.lower() not in BUILDING_SUFFIXES:
        fail(f'Непонятный файл зданий: {buildings_path.name}. Нужен parquet, geojson или gpkg.')

    output_path.parent.mkdir(parents=True, exist_ok=True)
    buildings = read_buildings(buildings_path)
    height_column = resolve_height_column(buildings, args.height_column)

    print(
        f'Здания: {len(buildings)} из {buildings_path.name}, CRS {crs_label(buildings.crs)}',
        file=sys.stderr,
    )

    sampler = DemSampler(dem_path, args.band, args.dem_to_meters)
    print(
        f'DEM: {dem_path.name}, CRS {crs_label(sampler.crs)}, канал {args.band}, '
        f'размер {sampler.width}x{sampler.height}',
        file=sys.stderr,
    )

    writer = FeatureWriter(output_path)
    placed = 0
    missing = 0
    try:
        if len(buildings) == 0:
            empty = buildings.copy()
            empty['ground_elevation'] = np.array([], dtype=np.float64)
            empty['roof_elevation'] = np.array([], dtype=np.float64)
            writer.write(empty)
        else:
            for start in range(0, len(buildings), args.batch_size):
                part = buildings.iloc[start : start + args.batch_size].copy()
                ground = sampler.elevations(part)
                part['ground_elevation'] = ground
                part['roof_elevation'] = ground + numeric_height(part, height_column)
                part.geometry = lift_to_ground(part.geometry, ground)
                writer.write(part)
                placed += int(np.isfinite(ground).sum())
                missing += int((~np.isfinite(ground)).sum())
                print(
                    f'  {min(start + args.batch_size, len(buildings))}/{len(buildings)}',
                    file=sys.stderr,
                )
    finally:
        sampler.close()
        writer.close()

    print(
        f'Готово: {output_path}\n'
        f'С отметкой земли: {placed}\n'
        f'Вне DEM или без данных: {missing}',
        file=sys.stderr,
    )
    if len(buildings) > 0 and placed == 0:
        fail('Ни одно здание не попало в DEM. Проверь CRS и охват карты высот.')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Добавляет зданиям LoD1 высоту местности, на которой они стоят.',
    )
    parser.add_argument(
        'buildings',
        type=Path,
        help='Файл GlobalBuildingAtlas LoD1: .parquet, .geojson или .gpkg',
    )
    parser.add_argument('dem', type=Path, help='Карта высот, обычно GeoTIFF')
    parser.add_argument('-o', '--output', type=Path, required=True, help='Новый файл LoD1')
    parser.add_argument(
        '--height-column',
        help='Колонка высоты здания над землёй. По умолчанию ищется height',
    )
    parser.add_argument('--band', type=int, default=1, help='Канал DEM, нумерация с 1')
    parser.add_argument(
        '--dem-to-meters',
        type=float,
        default=1.0,
        help='Множитель единиц DEM. Для высот в футах укажи 0.3048',
    )
    parser.add_argument('--batch-size', type=int, default=100_000, help='Сколько зданий обрабатывать за раз')
    args = parser.parse_args()
    if args.band < 1:
        fail('--band начинается с 1')
    if args.batch_size < 1:
        fail('--batch-size должен быть больше нуля')
    if args.dem_to_meters == 0:
        fail('--dem-to-meters не может быть 0')
    return args


def require_dependencies() -> None:
    missing = []
    for name in ('geopandas', 'rasterio', 'shapely', 'pyproj'):
        try:
            __import__(name)
        except ImportError:
            missing.append(name)
    if missing:
        fail(
            'Не хватает пакетов: '
            + ', '.join(missing)
            + '\nУстанови их: pip install -r scripts/requirements.txt'
        )


def read_buildings(path: Path):
    import geopandas as gpd

    suffix = path.suffix.lower()
    if suffix in {'.json', '.geojson'}:
        reject_height_index(path)
    if suffix in {'.parquet', '.geoparquet'}:
        frame = gpd.read_parquet(path)
    else:
        frame = gpd.read_file(path)

    if frame.crs is None:
        frame = frame.set_crs('OGC:CRS84')
        print('У зданий нет CRS, считаю их долготой и широтой WGS84.', file=sys.stderr)
    return frame


def reject_height_index(path: Path) -> None:
    with path.open('rb') as source:
        sample = source.read(4096).lstrip()
    if sample.startswith(b'{"type"') or sample.startswith(b'[\n') or sample.startswith(b'[{'):
        return
    if b'"height"' in sample and b'"geometry"' not in sample and b'"coordinates"' not in sample:
        fail(
            f'{path.name} — это индекс высот GlobalBuildingAtlas: у каждого здания есть '
            'только id, height и var, без контура и координат.\n'
            'Для отметки земли нужен GeoJSON с полигонами того же тайла '
            '(GBA.ODbLPolygon или GBA.Polygon). Его можно собрать скриптом produce_lod1.py '
            'с сайта датасета и уже этот файл передать сюда.'
        )


def resolve_height_column(buildings, explicit: str | None) -> str:
    if explicit:
        if explicit not in buildings.columns:
            fail(f'В файле зданий нет колонки {explicit}')
        return explicit
    for name in HEIGHT_CANDIDATES:
        if name in buildings.columns:
            return name
    columns = ', '.join(map(str, buildings.columns))
    fail(f'Не нашёл колонку высоты здания. Есть колонки: {columns}')


def numeric_height(buildings, column: str) -> np.ndarray:
    import pandas as pd

    values = pd.to_numeric(buildings[column], errors='coerce').to_numpy(dtype=np.float64)
    return values


def lift_to_ground(geometries, elevations: np.ndarray):
    from shapely import force_3d

    values = np.array(geometries, dtype=object, copy=True)
    finite = np.isfinite(elevations)
    if finite.any():
        values[finite] = force_3d(values[finite], z=elevations[finite])
    return values


def crs_label(crs) -> str:
    if crs is None:
        return 'не указана'
    authority = crs.to_authority()
    if authority:
        return f'{authority[0]}:{authority[1]}'
    name = getattr(crs, 'name', None)
    return name or 'неизвестная'


class DemSampler:
    def __init__(self, path: Path, band: int, scale: float) -> None:
        import rasterio
        from pyproj import CRS, Transformer

        self.rasterio = rasterio
        self.dataset = rasterio.open(path)
        if self.dataset.crs is None:
            self.dataset.close()
            fail(f'У DEM нет CRS: {path}')
        if band > self.dataset.count:
            count = self.dataset.count
            self.dataset.close()
            fail(f'В DEM {count} канал(ов), запрошен {band}')

        self.band = band
        self.scale = scale
        self.crs = CRS.from_user_input(self.dataset.crs)
        self.width = self.dataset.width
        self.height = self.dataset.height
        self.nodata = self.dataset.nodata
        self._transformers: dict[str, Transformer] = {}
        dtype = np.dtype(self.dataset.dtypes[band - 1])
        if self.width * self.height * dtype.itemsize <= DEM_MEMORY_LIMIT:
            self.array = self.dataset.read(band, masked=True)
        else:
            self.array = None
            print('DEM большой, высоты читаются с диска по точкам.', file=sys.stderr)

    def elevations(self, buildings) -> np.ndarray:
        from pyproj import CRS, Transformer

        with warnings.catch_warnings():
            warnings.filterwarnings('ignore', message='Geometry is in a geographic CRS')
            centroids = buildings.geometry.centroid
        xs = centroids.x.to_numpy(dtype=np.float64)
        ys = centroids.y.to_numpy(dtype=np.float64)

        source = CRS.from_user_input(buildings.crs)
        key = source.to_wkt()
        transformer = self._transformers.get(key)
        if transformer is None:
            transformer = Transformer.from_crs(source, self.crs, always_xy=True)
            self._transformers[key] = transformer
        if not source.equals(self.crs):
            xs, ys = transformer.transform(xs, ys)
            xs = np.asarray(xs, dtype=np.float64)
            ys = np.asarray(ys, dtype=np.float64)

        return self._lookup(xs, ys)

    def _lookup(self, xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
        from rasterio.transform import rowcol

        result = np.full(xs.shape, np.nan, dtype=np.float64)
        finite = np.isfinite(xs) & np.isfinite(ys)
        if not finite.any():
            return result

        rows, cols = rowcol(self.dataset.transform, xs[finite], ys[finite])
        rows = np.asarray(rows, dtype=np.int64)
        cols = np.asarray(cols, dtype=np.int64)
        inside = (rows >= 0) & (cols >= 0) & (rows < self.height) & (cols < self.width)
        if not inside.any():
            return result

        finite_index = np.flatnonzero(finite)
        selected = finite_index[inside]
        if self.array is not None:
            values = np.asarray(self.array[rows[inside], cols[inside]], dtype=np.float64)
            if np.ma.isMaskedArray(self.array):
                masked = np.ma.getmaskarray(self.array)[rows[inside], cols[inside]]
                values = np.where(masked, np.nan, values)
        else:
            coords = list(zip(xs[selected].tolist(), ys[selected].tolist(), strict=True))
            values = np.fromiter(
                (sample[0] for sample in self.dataset.sample(coords, indexes=self.band)),
                dtype=np.float64,
                count=len(coords),
            )

        if self.nodata is not None and np.isfinite(self.nodata):
            values = np.where(np.isclose(values, self.nodata), np.nan, values)
        values = np.where(np.isfinite(values), values * self.scale, np.nan)
        result[selected] = values
        return result

    def close(self) -> None:
        self.dataset.close()


class FeatureWriter:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.kind = output_kind(path)
        self._parts: list = []

    def write(self, buildings) -> None:
        self._parts.append(buildings)

    def close(self) -> None:
        if not self._parts:
            return
        import geopandas as gpd
        import pandas as pd

        crs = self._parts[0].crs
        frame = gpd.GeoDataFrame(pd.concat(self._parts, ignore_index=True), crs=crs)
        self._parts.clear()
        if self.kind == 'parquet':
            frame.to_parquet(self.path)
        elif self.kind == 'geojson':
            frame.to_file(self.path, driver='GeoJSON')
        else:
            frame.to_file(self.path, driver='GPKG')


def output_kind(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {'.parquet', '.geoparquet'}:
        return 'parquet'
    if suffix in {'.geojson', '.json'}:
        return 'geojson'
    if suffix == '.gpkg':
        return 'gpkg'
    fail(f'Неизвестный формат результата: {path.name}. Нужен .parquet, .geojson или .gpkg')


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


if __name__ == '__main__':
    main()
