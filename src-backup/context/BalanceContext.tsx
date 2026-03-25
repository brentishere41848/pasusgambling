import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '../lib/api';

interface BalanceContextType {
  balance: number;
  totalDeposited: number;
  addBalance: (amount: number, isDeposit?: boolean) => void;
  subtractBalance: (amount: number) => boolean;
  setBalance: (amount: number) => void;
  refreshWallet: () => Promise<void>;
  coinsToUsd: (amount: number) => number;
}

interface WalletResponse {
  wallet: {
    balance: number;
    totalDeposited: number;
    totalWithdrawn: number;
  };
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'pasus_auth_token';
const COINS_PER_DOLLAR = 1;

async function parseApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data as WalletResponse;
}

function normalizeAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  let amount = Math.round(value);
  if (!Number.isSafeInteger(amount)) {
    amount = Math.sign(amount) * Math.min(Math.abs(amount), Number.MAX_SAFE_INTEGER);
  }
  return amount;
}

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [balance, setBalanceState] = useState<number>(0);
  const [totalDeposited, setTotalDeposited] = useState<number>(0);
  const balanceRef = useRef(0);
  const totalDepositedRef = useRef(0);

  const updateBalance = (nextBalance: number) => {
    balanceRef.current = nextBalance;
    setBalanceState(nextBalance);
  };

  const updateTotalDeposited = (nextTotalDeposited: number) => {
    totalDepositedRef.current = nextTotalDeposited;
    setTotalDeposited(nextTotalDeposited);
  };

  const syncWallet = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      updateBalance(0);
      updateTotalDeposited(0);
      return;
    }

    try {
      const data = await parseApiResponse(
        await apiFetch('/api/wallet/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      updateBalance(Number(data.wallet.balance || 0));
      updateTotalDeposited(Number(data.wallet.totalDeposited || 0));
    } catch {
      updateBalance(0);
      updateTotalDeposited(0);
    }
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      updateBalance(0);
      updateTotalDeposited(0);
      return;
    }

    syncWallet().catch(() => undefined);
  }, [isAuthenticated, isLoading]);

  const addBalance = (amount: number, isDeposit: boolean = false) => {
    const normalizedAmount = Math.max(0, normalizeAmount(Number(amount || 0)));
    updateBalance(balanceRef.current + normalizedAmount);
    if (isDeposit) {
      updateTotalDeposited(totalDepositedRef.current + normalizedAmount);
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return;
    }

    const url = isDeposit ? '/api/wallet/deposit' : '/api/wallet/adjust';
    const body = isDeposit ? { amount: normalizedAmount } : { delta: normalizedAmount };

    apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(parseApiResponse)
      .then(() => undefined)
      .catch(() => {
        syncWallet().catch(() => undefined);
      });
  };

  const subtractBalance = (amount: number) => {
    const normalizedAmount = Math.max(0, normalizeAmount(Number(amount || 0)));

    if (balanceRef.current < normalizedAmount || normalizedAmount <= 0) {
      return false;
    }

    updateBalance(balanceRef.current - normalizedAmount);

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return false;
    }

    apiFetch('/api/wallet/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delta: -normalizedAmount }),
    })
      .then(parseApiResponse)
      .then(() => undefined)
      .catch(() => {
        syncWallet().catch(() => undefined);
      });

    return true;
  };

  const setBalance = (amount: number) => {
    updateBalance(amount);
  };

  const coinsToUsd = (amount: number) => Number(amount || 0) / COINS_PER_DOLLAR;

  return (
    <BalanceContext.Provider value={{ balance, totalDeposited, addBalance, subtractBalance, setBalance, refreshWallet: syncWallet, coinsToUsd }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (!context) {
    throw new Error('useBalance must be used within BalanceProvider');
  }
  return context;
};
