import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useLabStore } from './store/labStore';
import './index.css';

// Diagnostic hook for automated browser verification; only exposed when explicitly requested.
if (new URLSearchParams(window.location.search).has('debug')) {
  (window as unknown as { __labStore: typeof useLabStore }).__labStore = useLabStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
