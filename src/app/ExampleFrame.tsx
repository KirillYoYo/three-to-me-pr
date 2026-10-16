import { type ReactNode, useEffect } from 'react';

import type { ExampleLink } from '../catalog';
import { ExampleCanvas, type CameraConfig } from '../scene/ExampleCanvas';

export function ExampleFrame({
  example,
  controls,
  children,
  camera,
  hint,
}: {
  example: ExampleLink;
  controls: ReactNode;
  children: ReactNode;
  camera?: CameraConfig;
  hint?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${example.title} · drei`;
  }, [example.title]);

  return (
    <div className="workspace">
      <header className="example-header">
        <p className="eyebrow">{example.eyebrow}</p>
        <h1>{example.title}</h1>
        <p className="summary">{example.summary}</p>
      </header>
      <div className="stage">
        <ExampleCanvas camera={camera}>{children}</ExampleCanvas>
        <div className="stage-overlay">{hint ?? example.hint}</div>
      </div>
      <aside className="panel">
        <p className="panel-title">Параметры</p>
        {controls}
      </aside>
    </div>
  );
}
