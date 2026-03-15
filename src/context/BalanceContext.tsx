import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

function usdToCoins(value: number) {
  return normalizeCoins(value * 50);
}

function coinsToUsdValue(value: number) {
  return Math.round((value / 50) * 100) / 100;
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
        await fetch('/api/wallet/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      updateBalance(coinsToUsdValue(data.wallet.balance));
      updateTotalDeposited(coinsToUsdValue(data.wallet.totalDeposited));
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
    const normalizedAmount = Math.max(0, Number(amount || 0));
    const normalizedCoins = usdToCoins(normalizedAmount);
    updateBalance(balanceRef.current + normalizedAmount);
    if (isDeposit) {
      updateTotalDeposited(totalDepositedRef.current + normalizedAmount);
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      return;
    }

    const url = isDeposit ? '/api/wallet/deposit' : '/api/wallet/adjust';
    const body = isDeposit ? { amount: normalizedCoins } : { delta: normalizedCoins };

    fetch(url, {
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
    const normalizedAmount = Math.max(0, Number(amount || 0));
    const normalizedCoins = usdToCoins(normalizedAmount);

    if (balanceRef.current < normalizedAmount || normalizedCoins <= 0) {
      return false;
    }

    updateBalance(balanceRef.current - normalizedAmount);

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
      body: JSON.stringify({ delta: -normalizedCoins }),
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

  const coinsToUsd = (coins: number) => coins;

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
