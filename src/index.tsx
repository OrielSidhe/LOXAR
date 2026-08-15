
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { LoxarBridge } from './types';

// Define the type for the API exposed by the preload script
declare global {
  interface Window {
    loxarBridge: LoxarBridge;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);