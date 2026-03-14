import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useBalance } from './BalanceContext';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  currency: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  updateCurrency: (currency: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const { setBalance } = useBalance();

  const login = (username: string) => {
    // Mock login
    setUser({
      id: '1',
      username,
      email: `${username.toLowerCase()}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      currency: 'USD'
    });
    // Start with 50 coins ($1)
    setBalance(50);
  };

  const logout = () => {
    setUser(null);
    setBalance(0);
  };

  const updateCurrency = (currency: string) => {
    if (user) {
      setUser({ ...user, currency });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateCurrency, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
