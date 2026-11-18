import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { fotoPadrao } from '../components/DogCard';
import { StatusBadge, fmtDate } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import type { Match } from '../types';

export function MyMatches() {
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[] | null>(null);

  const load = useCallback(
    () => api<Match[]>('/matches/meus').then(setMatches).catch((e) => notify('error', e.message)),
    [notify],
  );
  useEffect(() => void load(), [load]);

  async function cancelar(m: Match) {
    if (!confirm(`Cancelar o pedido de adoção de ${m.animal.nome}?`)) return;
    try {
      await api(`/matches/${m.id}/cancelar`, { method: 'PATCH' });
      notify('success', 'Pedido cancelado.');
    } catch (e) {
      notify('error', (e as Error).message);
    }
    load();
  }

  return (
    <>
      <h2>Meus pedidos de adoção</h2>
      {matches === null && <p className="muted">Carregando…</p>}
      {matches?.length === 0 && <p className="muted">Você ainda não solicitou nenhuma adoção. <Link to="/">Ver cachorros</Link></p>}
      <div className="list">
        {matches?.map((m) => (
          <div className="item" key={m.id}>
            <img src={m.animal.foto || fotoPadrao} alt={m.animal.nome} onError={(e) => (e.currentTarget.src = fotoPadrao)} />
            <div className="grow">
              <h3><Link to={`/caes/${m.animal.id}`}>{m.animal.nome}</Link> <StatusBadge status={m.status} /></h3>
              <p className="muted">{m.animal.raca} · {m.animal.instituicao.nome}</p>
              <p>Solicitado em {fmtDate(m.criadoEm, true)} · Visita: <strong>{fmtDate(m.dataVisita, true)}</strong></p>
              {m.observacoes && <p className="muted">“{m.observacoes}”</p>}
              {m.status === 'APROVADO' && <p className="ok-text">Parabéns! Entre em contato: {m.animal.instituicao.telefone ?? m.animal.instituicao.nome}.</p>}
            </div>
            {(m.status === 'PENDENTE' || m.status === 'EM_ANDAMENTO') && (
              <button className="btn danger small" onClick={() => cancelar(m)}>Cancelar</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
