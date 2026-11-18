import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../api';
import type { Role, User } from '../types';
import { useToast } from './ToastContext';

interface LoginStepResponse {
  requires2FA: boolean;
  role: Role;
  email: string;
  devCodeHint?: string;
}

interface AuthState {
  user: User | null;
  role: Role | null;
  loading: boolean;
  login: (role: Role, email: string, senha: string) => Promise<LoginStepResponse>;
  verify2FA: (role: Role, email: string, code: string) => Promise<void>;
  register: (role: Role, data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthCtx = createContext<AuthState>(null as never);
export const useAuth = () => useContext(AuthCtx);

interface AuthResponse {
  token?: string;
  role: Role;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      notify('error', 'Sua sessão expirou. Faça login novamente.');
    });
    if (!tokenStore.get()) return;
    api<AuthResponse>('/perfil')
      .then((r) => {
        setUser(r.user);
        setRole(r.role);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logout, notify]);

  const accept = (r: AuthResponse) => {
    tokenStore.set(r.token!);
    setUser(r.user);
    setRole(r.role);
  };

  const login: AuthState['login'] = async (role, email, senha) =>
    await api<LoginStepResponse>('/auth/login', { method: 'POST', body: { role, email, senha } });

  const verify2FA: AuthState['verify2FA'] = async (role, email, code) =>
    accept(await api<AuthResponse>('/auth/verify-2fa', { method: 'POST', body: { role, email, code } }));

  const register: AuthState['register'] = async (role, data) =>
    accept(await api<AuthResponse>(`/auth/register/${role === 'ADOTANTE' ? 'adotante' : 'instituicao'}`, { method: 'POST', body: data }));

  return <AuthCtx.Provider value={{ user, role, loading, login, verify2FA, register, logout, setUser }}>{children}</AuthCtx.Provider>;
}