import React from 'react'
import ReactDOM from 'react-dom/client'
import StudentGroupManager from './StudentGroupManager'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StudentGroupManager />
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl, { scope: import.meta.env.BASE_URL }).catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
