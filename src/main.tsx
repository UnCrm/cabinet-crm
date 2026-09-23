import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker for Chrome & Installed PWA standalone mode
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('CRM+ : Mise à jour disponible pour l\'application installée.');
    },
    onOfflineReady() {
      console.log('CRM+ : Service worker prêt pour le mode hors-ligne et notifications Chrome/PWA.');
    },
    onRegisterError(error) {
      console.warn('CRM+ : Enregistrement du service worker échoué:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
