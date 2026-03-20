import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  currency: string;
  role: 'owner' | 'moderator' | 'user';
  robloxUserId?: number;
  robloxUsername?: string;
  robloxDisplayName?: string;
  robloxAvatarUrl?: string;
  robloxVerifiedAt?: string;
  discordUserId?: string;
  discordUsername?: string;
  discordDisplayName?: string;
  discordAvatarUrl?: string;
  discordVerifiedAt?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, affiliateCode?: string) => Promise<void>;
  logout: () => void;
  updateCurrency: (currency: string) => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'pasus_auth_token';
const USER_STORAGE_KEY = 'pasus_user';
async function parseApiResponse(response: Response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed.');
  }

  return data;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) as User : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setUser(null);
      return;
    }

    const data = await parseApiResponse(
      await apiFetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    setUser(data.user as User);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setIsLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const applyAuthenticatedUser = (nextUser: User, token: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setUser(nextUser);
  };

  const login = async (username: string, password: string) => {
    const data = await parseApiResponse(
      await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })
    );

    applyAuthenticatedUser(data.user as User, data.token as string);
  };

  const register = async (username: string, email: string, password: string, affiliateCode?: string) => {
    const data = await parseApiResponse(
      await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          affiliateCode,
        }),
      })
    );

    applyAuthenticatedUser(data.user as User, data.token as string);
  };

  const logout = () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (token) {
      apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined);
    }

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  const updateCurrency = (currency: string) => {
    if (user) {
      setUser({ ...user, currency });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateCurrency,
        setUser,
        refreshUser,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
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
