
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// v19.3 캐시 강제 갱신 및 최신 로직 반영
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
