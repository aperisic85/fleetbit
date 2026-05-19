import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type UserRole = 'admin' | 'moderator' | 'client';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  company_name: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'fb_auth';

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  const login = useCallback((token: string, user: AuthUser) => {
    const next = { token, user };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    setState({ token: null, user: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isAuthenticated: !!state.token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth mora biti unutar AuthProvider');
  return ctx;
}
