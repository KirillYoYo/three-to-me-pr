export interface ExampleLink {
  path: string;
  title: string;
  eyebrow: string;
  summary: string;
  hint: string;
}

export const groups: { title: string; items: ExampleLink[] }[] = [
  {
    title: 'Камеры и контролы',
    items: [
      {
        path: '/orbit-controls',
        title: 'OrbitControls',
        eyebrow: 'орбита камеры',
        summary:
          'Камера крутится вокруг сцены. Ползунки ограничивают дистанцию, угол и скорость — это сразу видно, если задрать или отдалить вид.',
        hint: 'Тяни левой кнопкой, колесо приближает, правая кнопка сдвигает.',
      },
      {
        path: '/scroll-controls',
        title: 'ScrollControls',
        eyebrow: 'скролл сцены',
        summary:
          'Прокрутка двигает объекты и подписи. Offset внизу кадра — это прогресс скролла от 0 до 1, им же анимируется масштаб.',
        hint: 'Крути колесо внутри сцены, не в боковой панели.',
      },
      {
        path: '/presentation-controls',
        title: 'PresentationControls',
        eyebrow: 'осмотр модели',
        summary:
          'Модель можно покрутить, но она пружинит в заданных пределах. Snap возвращает её в исходный поворот, когда отпускаешь.',
        hint: 'Потяни карточку. С включённым snap она вернётся на место.',
      },
    ],
  },
  {
    title: 'Загрузка ассетов',
    items: [
      {
        path: '/use-gltf',
        title: 'useGLTF',
        eyebrow: 'glTF / GLB',
        summary:
          'DamagedHelmet.glb с материалами и текстурами из файла. Окружение нужно, чтобы металл и шероховатость шлема было видно.',
        hint: 'Модель Khronos glTF Sample Assets, лицензия CC BY 4.0.',
      },
      {
        path: '/use-texture',
        title: 'useTexture',
        eyebrow: 'текстуры',
        summary:
          'Три карты: цвет, шероховатость и нормали. Повтор и сдвиг читаются на плоскости, объём нормалей — на сфере.',
        hint: 'Белый треугольник в клетке показывает, куда уехал offset.',
      },
      {
        path: '/use-fbx',
        title: 'useFBX',
        eyebrow: 'FBX',
        summary:
          'Stanford Bunny из FBX. Формат часто приезжает в другом масштабе и с Phong-материалом — здесь он вписан в кадр и красится цветом.',
        hint: 'Если модель лежит на боку, крути «поворот X».',
      },
    ],
  },
  {
    title: 'Абстракции',
    items: [
      {
        path: '/text',
        title: 'Text',
        eyebrow: 'тройка-текст',
        summary:
          'Настоящая 3D-сетка из глифов, не HTML. Меняй строку, кегль, ширину и обводку — переносы и контур обновляются сразу.',
        hint: 'Шрифт Inter, в нём есть кириллица.',
      },
      {
        path: '/image',
        title: 'Image',
        eyebrow: 'плоскость с кадром',
        summary:
          'Картинка лежит на меше в сцене. Zoom обрезает кадр, radius скругляет углы альфой, grayscale обесцвечивает.',
        hint: 'Покрути орбиту: за постером есть пластина, это не HTML-картинка.',
      },
      {
        path: '/html',
        title: 'Html',
        eyebrow: 'DOM в сцене',
        summary:
          'Подписи — обычный HTML, привязанный к 3D-точкам. Кнопка кликается. Occlude прячет подпись, когда перед ней другой объект.',
        hint: 'Поверни камеру так, чтобы узел оказался за кольцом.',
      },
      {
        path: '/environment',
        title: 'Environment',
        eyebrow: 'HDRI',
        summary:
          'Один и тот же металл в пяти степенях шероховатости. Смена HDR сразу видна и в фоне, и в отражении на сферах.',
        hint: 'Слева шар матовый, справа почти зеркало. HDR — Poly Haven, CC0.',
      },
    ],
  },
  {
    title: 'Спецэффекты',
    items: [
      {
        path: '/mesh-wobble',
        title: 'MeshWobbleMaterial',
        eyebrow: 'изгиб сетки',
        summary:
          'Вершины качаются синусом по высоте. На бруске изгиб читается лучше, чем на сфере: factor — амплитуда, speed — частота.',
        hint: 'Поставь factor на ноль: оба объекта замирают в исходной форме.',
      },
      {
        path: '/mesh-distort',
        title: 'MeshDistortMaterial',
        eyebrow: 'шум поверхности',
        summary:
          'Simplex-шум раздувает вершины. Distort задаёт силу, radius — базовый размер, speed — скорость шума.',
        hint: 'Подними сегменты глазами: сфера уже плотная, шум виден по силуэту.',
      },
      {
        path: '/mesh-transmission',
        title: 'MeshTransmissionMaterial',
        eyebrow: 'стекло',
        summary:
          'Материал переснимает сцену за объектом и преломляет её. Толщина, хроматическая аберрация и distortion меняют картинку внутри стекла.',
        hint: 'Это тяжелее остальных страниц: стекло рендерит сцену ещё раз каждый кадр.',
      },
    ],
  },
];

export function getExample(path: string) {
  for (const group of groups) {
    const found = group.items.find((item) => item.path === path);
    if (found) return found;
  }
  throw new Error(`Unknown example: ${path}`);
}
