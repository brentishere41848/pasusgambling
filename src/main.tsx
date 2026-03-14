import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BalanceProvider } from './context/BalanceContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BalanceProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BalanceProvider>
  </StrictMode>,
);
