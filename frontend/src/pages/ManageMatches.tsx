import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { fotoPadrao } from '../components/DogCard';
import { StatusBadge, fmtDate } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import type { Match, MatchStatus } from '../types';

export function ManageMatches() {
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [filter, setFilter] = useState<MatchStatus | 'TODOS'>('TODOS');
  const [visita, setVisita] = useState<Record<number, string>>({});

  const load = useCallback(
    () => api<Match[]>('/matches/instituicao').then(setMatches).catch((e) => notify('error', e.message)),
    [notify],
  );
  useEffect(() => void load(), [load]);

  async function change(m: Match, status: Exclude<MatchStatus, 'PENDENTE'>, okMsg: string) {
    try {
      await api(`/matches/${m.id}/status`, {
        method: 'PATCH',
        body: { status, ...(visita[m.id] && { dataVisita: new Date(visita[m.id]).toISOString() }) },
      });
      notify('success', okMsg);
    } catch (e) {
      notify('error', (e as Error).message); // ex.: RN04 – já existe match APROVADO
    }
    load();
  }

  const shown = matches?.filter((m) => filter === 'TODOS' || m.status === filter);

  return (
    <>
      <div className="toolbar">
        <h2>Solicitações de adoção</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="TODOS">Todos os status</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="APROVADO">Aprovados</option>
          <option value="CANCELADO">Cancelados</option>
        </select>
      </div>
      <p className="muted small-text">Dica: aprove dois pedidos do mesmo cão para ver a regra RN04 bloqueando a segunda aprovação.</p>
      {matches === null && <p className="muted">Carregando…</p>}
      {shown?.length === 0 && <p className="muted">Nenhuma solicitação.</p>}
      <div className="list">
        {shown?.map((m) => {
          const open = m.status === 'PENDENTE' || m.status === 'EM_ANDAMENTO';
          return (
            <div className="item col" key={m.id}>
              <div className="row nowrap">
                <img src={m.animal.foto || fotoPadrao} alt={m.animal.nome} onError={(e) => (e.currentTarget.src = fotoPadrao)} />
                <div className="grow">
                  <h3>{m.animal.nome} <StatusBadge status={m.status} /></h3>
                  <p><strong>{m.adotante.nome}</strong> · {m.adotante.email}{m.adotante.telefone ? ` · ${m.adotante.telefone}` : ''}</p>
                  <p className="muted">Pets em casa: {m.adotante.possuiPets ? m.adotante.qtdPets : 'nenhum'} · Pedido em {fmtDate(m.criadoEm, true)} · Visita: {fmtDate(m.dataVisita, true)}</p>
                  {m.observacoes && <p className="muted">“{m.observacoes}”</p>}
                </div>
              </div>
              {open && (
                <div className="row vac">
                  <input type="datetime-local" title="Agendar visita" value={visita[m.id] ?? ''} onChange={(e) => setVisita({ ...visita, [m.id]: e.target.value })} />
                  {m.status === 'PENDENTE' && <button className="btn secondary small" onClick={() => change(m, 'EM_ANDAMENTO', 'Análise iniciada.')}>Iniciar análise</button>}
                  <button className="btn small" onClick={() => change(m, 'APROVADO', `Adoção de ${m.animal.nome} aprovada! 🎉`)}>Aprovar</button>
                  <button className="btn danger small" onClick={() => change(m, 'CANCELADO', 'Solicitação recusada.')}>Recusar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
