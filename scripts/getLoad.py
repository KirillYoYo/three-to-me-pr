import geopandas as gpd

# Убрали пробелы после запятых!
bbox = "-14000,6710000,-13000,6711000,EPSG:3857"

url = (
    "https://tubvsig-so2sat-vm1.srv.mwn.de/geoserver/ows?"
    "service=WFS&version=2.0.0&request=GetFeature&"
    "typeNames=global3D:lod1_global&"
    "srsName=EPSG:3857&"
    f"bbox={bbox}"
)

print("Скачиваем данные с сервера TUM...")
try:
    gdf = gpd.read_file(url)
    print(f"Успешно скачано {len(gdf)} зданий.")

    # Сохраняем в GeoJSON
    gdf.to_file("london_bigben_1mile.geojson", driver="GeoJSON")
    print("Файл сохранён: london_bigben_1mile.geojson")
except Exception as e:
    print(f"Произошла ошибка: {e}")
