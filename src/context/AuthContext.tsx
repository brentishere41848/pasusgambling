import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  customAvatarUrl?: string;
  avatarSource?: 'custom' | 'roblox' | 'discord';
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
  totpEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, totpCode?: string) => Promise<void>;
  register: (username: string, email: string, password: string, affiliateCode?: string, emailOptIn?: boolean) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => void;
  updateCurrency: (currency: string) => void;
  updatePreferences: (preferences: { currency?: string; avatarSource?: 'custom' | 'roblox' | 'discord'; customAvatarUrl?: string }) => Promise<void>;
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
    const error = new Error(data.error || 'Request failed.') as Error & Record<string, unknown>;
    Object.assign(error, data);
    throw error;
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

  const login = async (username: string, password: string, totpCode?: string) => {
    const data = await parseApiResponse(
      await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          totpCode,
        }),
      })
    );

    applyAuthenticatedUser(data.user as User, data.token as string);
  };

  const register = async (username: string, email: string, password: string, affiliateCode?: string, emailOptIn?: boolean) => {
    await parseApiResponse(
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
          emailOptIn: emailOptIn ?? false,
        }),
      })
    );
  };

  const verifyEmail = async (email: string, code: string) => {
    const data = await parseApiResponse(
      await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
        }),
      })
    );

    applyAuthenticatedUser(data.user as User, data.token as string);
  };

  const resendVerification = async (email: string) => {
    await parseApiResponse(
      await apiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
        }),
      })
    );
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

  const updatePreferences = async (preferences: { currency?: string; avatarSource?: 'custom' | 'roblox' | 'discord'; customAvatarUrl?: string }) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      throw new Error('Unauthorized.');
    }

    const data = await parseApiResponse(
      await apiFetch('/api/account/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      })
    );

    setUser(data.user as User);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        updateCurrency,
        updatePreferences,
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
