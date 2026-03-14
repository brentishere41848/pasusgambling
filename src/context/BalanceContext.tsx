import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface BalanceContextType {
  balance: number;
  totalDeposited: number;
  addBalance: (amount: number, isDeposit?: boolean) => void;
  subtractBalance: (amount: number) => boolean;
  setBalance: (amount: number) => void;
  refreshWallet: () => Promise<void>;
  coinsToUsd: (coins: number) => number;
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

async function parseApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data as WalletResponse;
}

function normalizeCoins(value: number) {
  const amount = Math.round(value);
  return Number.isFinite(amount) ? amount : 0;
}

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [balance, setBalanceState] = useState<number>(0);
  const [totalDeposited, setTotalDeposited] = useState<number>(0);

  const syncWallet = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setBalanceState(0);
      setTotalDeposited(0);
      return;
    }

    try {
      const data = await parseApiResponse(
        await fetch('/api/wallet/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      setBalanceState(data.wallet.balance);
      setTotalDeposited(data.wallet.totalDeposited);
    } catch {
      setBalanceState(0);
      setTotalDeposited(0);
    }
  };

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setBalanceState(0);
      setTotalDeposited(0);
      return;
    }

    syncWallet().catch(() => undefined);
  }, [isAuthenticated, isLoading]);

  const addBalance = (amount: number, isDeposit: boolean = false) => {
    const normalizedAmount = normalizeCoins(amount);
    setBalanceState((prev) => prev + normalizedAmount);
    if (isDeposit) {
      setTotalDeposited((prev) => prev + normalizedAmount);
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return;
    }

    const url = isDeposit ? '/api/wallet/deposit' : '/api/wallet/adjust';
    const body = isDeposit ? { amount: normalizedAmount } : { delta: normalizedAmount };

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
      .then(parseApiResponse)
      .then((data) => {
        setBalanceState(data.wallet.balance);
        setTotalDeposited(data.wallet.totalDeposited);
      })
      .catch(() => {
        syncWallet().catch(() => undefined);
      });
  };

  const subtractBalance = (amount: number) => {
    const normalizedAmount = normalizeCoins(amount);

    if (balance < normalizedAmount || normalizedAmount <= 0) {
      return false;
    }

    setBalanceState((prev) => prev - normalizedAmount);

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return false;
    }

    fetch('/api/wallet/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ delta: -normalizedAmount }),
    })
      .then(parseApiResponse)
      .then((data) => {
        setBalanceState(data.wallet.balance);
        setTotalDeposited(data.wallet.totalDeposited);
      })
      .catch(() => {
        syncWallet().catch(() => undefined);
      });

    return true;
  };

  const setBalance = (amount: number) => {
    setBalanceState(amount);
  };

  const coinsToUsd = (coins: number) => coins / 50;

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
