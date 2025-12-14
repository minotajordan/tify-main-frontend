import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App';
import { I18nProvider } from './i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const toastContainer = (() => {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.top = '16px';
  el.style.right = '16px';
  el.style.zIndex = '10000';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = '8px';
  document.body.appendChild(el);
  return el;
})();

window.addEventListener('tify:error', (e: any) => {
  const { error, code, status } = (e as CustomEvent)?.detail || {};
  const t = document.createElement('div');
  t.style.background = '#DC2626';
  t.style.color = '#fff';
  t.style.padding = '8px 12px';
  t.style.borderRadius = '8px';
  t.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  t.style.fontSize = '12px';
  t.style.transition = 'opacity .3s';
  t.innerHTML = `<div style="font-weight:600">${error || 'Error'}</div><div style="opacity:.8">${code || ''}${status ? ` · ${status}` : ''}</div>`;
  toastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => toastContainer.removeChild(t), 300);
  }, 5000);
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
