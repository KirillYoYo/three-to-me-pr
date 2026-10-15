import './style.css';

import { World } from './scene/world';

const root = document.querySelector('#app');

if (!(root instanceof HTMLElement)) {
  throw new Error('Missing #app root element');
}

const world = new World(root);
void world.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    world.dispose();
  });
}
