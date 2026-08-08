import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppComponent from './App.tsx';
import { App as AntdApp } from 'antd';
import { ToastContainer } from './utils/toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AntdApp>
      <ToastContainer />
      <AppComponent />
    </AntdApp>
  </StrictMode>,
);
