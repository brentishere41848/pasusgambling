import React, { createContext, useContext, useState, useEffect } from 'react';

interface BalanceContextType {
  balance: number; // in coins
  totalDeposited: number; // in coins
  addBalance: (amount: number, isDeposit?: boolean) => void;
  subtractBalance: (amount: number) => boolean;
  setBalance: (amount: number) => void;
  coinsToUsd: (coins: number) => number;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalanceState] = useState<number>(() => {
    const saved = localStorage.getItem('pasus_balance');
    return saved ? parseFloat(saved) : 0;
  });

  const [totalDeposited, setTotalDeposited] = useState<number>(() => {
    const saved = localStorage.getItem('pasus_total_deposited');
    return saved ? parseFloat(saved) : 0;
  });

  useEffect(() => {
    localStorage.setItem('pasus_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('pasus_total_deposited', totalDeposited.toString());
  }, [totalDeposited]);

  const addBalance = (amount: number, isDeposit: boolean = false) => {
    setBalanceState(prev => prev + amount);
    if (isDeposit) {
      setTotalDeposited(prev => prev + amount);
    }
  };

  const subtractBalance = (amount: number) => {
    if (balance >= amount) {
      setBalanceState(prev => prev - amount);
      return true;
    }
    return false;
  };

  const setBalance = (amount: number) => {
    setBalanceState(amount);
  };

  const coinsToUsd = (coins: number) => {
    return coins / 50; // 50 coins = $1
  };

  return (
    <BalanceContext.Provider value={{ balance, addBalance, subtractBalance, setBalance, coinsToUsd }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (!context) throw new Error('useBalance must be used within BalanceProvider');
  return context;
};
