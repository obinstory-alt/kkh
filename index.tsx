
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// v18.1 캐시 강제 갱신용 주석 추가
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
