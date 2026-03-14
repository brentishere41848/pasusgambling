import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BalanceProvider } from './context/BalanceContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BalanceProvider>
        <App />
      </BalanceProvider>
    </AuthProvider>
  </StrictMode>,
);
