import { OrbitControls, Text } from '@react-three/drei';
import { useState } from 'react';

import { fontUrl } from '../assets';
import { ExampleFrame } from '../app/ExampleFrame';
import { getExample } from '../catalog';
import { Floor, StudioLights } from '../scene/ExampleCanvas';
import { ColorField, SelectField, Slider, TextArea } from '../ui/fields';

const example = getExample('/text');

const aligns = [
  { value: 'left', label: 'Слева' },
  { value: 'center', label: 'По центру' },
  { value: 'right', label: 'Справа' },
] as const;

type Align = (typeof aligns)[number]['value'];

const initial = 'Объёмный текст\nменяет кегль, обводку\nи ширину строки';

export default function TextPage() {
  const [copy, setCopy] = useState(initial);
  const [fontSize, setFontSize] = useState(0.48);
  const [maxWidth, setMaxWidth] = useState(4.2);
  const [lineHeight, setLineHeight] = useState(1.15);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [outlineWidth, setOutlineWidth] = useState(0.04);
  const [fillOpacity, setFillOpacity] = useState(1);
  const [color, setColor] = useState('#f4efe6');
  const [outline, setOutline] = useState('#e4a15a');
  const [align, setAlign] = useState<Align>('center');

  return (
    <ExampleFrame
      example={example}
      controls={
        <>
          <TextArea label="Строка" value={copy} onChange={setCopy} />
          <SelectField label="Выравнивание" value={align} options={aligns} onChange={setAlign} />
          <Slider
            label="Кегль"
            min={0.2}
            max={1}
            step={0.02}
            value={fontSize}
            onChange={setFontSize}
          />
          <Slider
            label="Ширина строки"
            min={1.2}
            max={8}
            step={0.1}
            value={maxWidth}
            onChange={setMaxWidth}
          />
          <Slider
            label="Интерлиньяж"
            min={0.8}
            max={1.8}
            step={0.05}
            value={lineHeight}
            onChange={setLineHeight}
          />
          <Slider
            label="Трекинг"
            min={-0.06}
            max={0.2}
            step={0.01}
            value={letterSpacing}
            onChange={setLetterSpacing}
          />
          <Slider
            label="Обводка"
            min={0}
            max={0.2}
            step={0.01}
            value={outlineWidth}
            onChange={setOutlineWidth}
          />
          <Slider
            label="Прозрачность"
            min={0.15}
            max={1}
            step={0.01}
            value={fillOpacity}
            onChange={setFillOpacity}
          />
          <ColorField label="Заливка" value={color} onChange={setColor} />
          <ColorField label="Цвет обводки" value={outline} onChange={setOutline} />
        </>
      }
    >
      <StudioLights />
      <Floor />
      <Text
        font={fontUrl}
        fontSize={fontSize}
        maxWidth={maxWidth}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        textAlign={align}
        anchorX="center"
        anchorY="middle"
        color={color}
        fillOpacity={fillOpacity}
        outlineWidth={outlineWidth}
        outlineColor={outline}
        whiteSpace="normal"
      >
        {copy.trim().length > 0 ? copy : ' '}
      </Text>
      <OrbitControls makeDefault enableDamping />
    </ExampleFrame>
  );
}
