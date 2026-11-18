import type { MatchStatus } from '../types';

const label: Record<MatchStatus, string> = {
  PENDENTE: '⏳ Pendente',
  EM_ANDAMENTO: '🔎 Em andamento',
  APROVADO: '🎉 Aprovado',
  CANCELADO: '❌ Cancelado',
};

export const StatusBadge = ({ status }: { status: MatchStatus }) => <span className={`badge ${status}`}>{label[status]}</span>;

export const fmtDate = (d?: string | null, time = false) =>
  d ? new Date(d).toLocaleString('pt-BR', time ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }) : '—';
