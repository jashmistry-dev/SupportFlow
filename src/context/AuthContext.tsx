import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.ts';

export type UserRole = 'REQUESTER' | 'SUPPORT_AGENT' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  switchUser: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('supportflow_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('supportflow_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.warn('Session expired or invalid token:', err);
        localStorage.removeItem('supportflow_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('supportflow_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const register = async (name: string, email: string, password: string, role?: UserRole) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('supportflow_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const logout = () => {
    localStorage.removeItem('supportflow_token');
    setToken(null);
    setUser(null);
  };

  const switchUser = async (email: string, password: string) => {
    await login(email, password);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
