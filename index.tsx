
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// [v19.6 ENGINE] 브라우저 캐시 고착을 뚫기 위한 긴급 마운트 스크립트
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
