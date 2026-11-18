import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../types';

/** Bloqueia rotas para deslogados (→ /login) e para papéis não permitidos (→ /). */
export function ProtectedRoute({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const { notify } = useToast();
  const location = useLocation();
  const denied = !loading && (!user || (roles && !roles.includes(role!)));

  useEffect(() => {
    if (!denied) return;
    notify('error', user ? 'Acesso negado: esta área é de outro perfil.' : 'Você precisa estar logado para acessar esta página.');
  }, [denied, user, notify]);

  if (loading) return <p className="center muted">Carregando…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (denied) return <Navigate to="/" replace />;
  return <>{children}</>;
}
