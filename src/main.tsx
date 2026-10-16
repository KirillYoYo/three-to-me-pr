import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App';
import './styles.css';

const root = document.querySelector('#app');

if (!(root instanceof HTMLElement)) {
  throw new Error('Missing #app root element');
}

createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
