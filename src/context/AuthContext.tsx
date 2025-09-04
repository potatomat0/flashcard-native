import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api, { setAuthToken, clearAuthToken } from '../services/api';
import { clearQueryCachePersist } from '../services/query';

type User = {
  id: string;
  username: string;
  name: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { username: string; name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: { name?: string; email?: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'flashcard_token';

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          setToken(stored);
          setAuthToken(stored);
          // Optionally fetch current profile to populate user
          try {
            const { data } = await api.get('/api/users/profile');
            setUser({
              id: data._id,
              username: data.username,
              name: data.name,
              email: data.email,
            });
          } catch {
            // token invalid, clear
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            clearAuthToken();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setInitializing(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/users/login', { email, password });
    const t = data.token as string;
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    setToken(t);
    setAuthToken(t);
    try {
      const prof = await api.get('/api/users/profile');
      setUser({ id: prof.data._id, username: prof.data.username, name: prof.data.name, email: prof.data.email });
    } catch {
      // Fallback to minimal user from login payload if profile fetch fails
      setUser({ id: data.user.id, username: data.user.username, name: data.user.name });
    }
  }, []);

  const register = useCallback(async (payload: { username: string; name: string; email: string; password: string }) => {
    // Register then login for convenience
    await api.post('/api/users/register', payload);
    await login(payload.email, payload.password);
  }, [login]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    clearAuthToken();
    setToken(null);
    setUser(null);
    await clearQueryCachePersist();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const { data } = await api.get('/api/users/profile');
    setUser({ id: data._id, username: data.username, name: data.name, email: data.email });
  }, [token]);

  const updateProfile = useCallback(async (payload: { name?: string; email?: string }) => {
    await api.patch('/api/users/profile', payload);
    await refreshProfile();
  }, [refreshProfile]);

  const deleteAccount = useCallback(async () => {
    await api.delete('/api/users/profile');
    await logout();
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, isAuthenticated: !!token, initializing, login, register, logout, refreshProfile, updateProfile, deleteAccount }),
    [user, token, initializing, login, register, logout, refreshProfile, updateProfile, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
