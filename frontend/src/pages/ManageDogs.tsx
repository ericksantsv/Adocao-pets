import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { fotoPadrao, idade } from '../components/DogCard';
import { fmtDate } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import type { Animal, Vacina } from '../types';

const empty = { nome: '', raca: '', dataNascimento: '', detalhes: '', foto: '' };
const today = () => new Date().toISOString().slice(0, 10);

export function ManageDogs() {
  const { notify } = useToast();
  const [dogs, setDogs] = useState<Animal[] | null>(null);
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [vac, setVac] = useState<Record<number, { vacinaId: string; data: string }>>({});

  const load = useCallback(
    () => api<Animal[]>('/animais/meus').then(setDogs).catch((e) => notify('error', e.message)),
    [notify],
  );
  useEffect(() => {
    load();
    api<Vacina[]>('/vacinas').then(setVacinas).catch(() => {});
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify('success', ok);
      await load();
      return true;
    } catch (e) {
      notify('error', (e as Error).message);
      return false;
    }
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = { ...form, detalhes: form.detalhes || undefined };
    const ok = await run(
      () => api(editing ? `/animais/${editing}` : '/animais', { method: editing ? 'PUT' : 'POST', body }),
      editing ? 'Cachorro atualizado!' : 'Cachorro cadastrado!',
    );
    if (ok) {
      setForm(empty);
      setEditing(null);
    }
  }

  const edit = (d: Animal) => {
    setEditing(d.id);
    setForm({ nome: d.nome, raca: d.raca, dataNascimento: d.dataNascimento.slice(0, 10), detalhes: d.detalhes ?? '', foto: d.foto ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (d: Animal) => confirm(`Remover ${d.nome}? Matches associados também serão apagados.`) && run(() => api(`/animais/${d.id}`, { method: 'DELETE' }), 'Cachorro removido.');

  const patchVac = (id: number, patch: Partial<{ vacinaId: string; data: string }>) =>
    setVac((s) => ({ ...s, [id]: { ...(s[id] ?? { vacinaId: '', data: today() }), ...patch } }));

  const addVacina =(d: Animal) => {
    const v = vac[d.id];
    if (!v?.vacinaId) return notify('error', 'Selecione uma vacina.');
    return run(
      () => api(`/animais/${d.id}/vacinas`, { method: 'POST', body: { vacinaId: Number(v.vacinaId), dataAplicacao: v.data || today() } }),
      'Vacina registrada!',
    );
  };

  return (
    <>
      <form className="form panel wide" onSubmit={save}>
        <h2>{editing ? '✏️ Editar cachorro' : '➕ Cadastrar novo cachorro'}</h2>
        <div className="row">
          <label>Nome<input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
          <label>Raça<input required value={form.raca} onChange={(e) => setForm({ ...form, raca: e.target.value })} /></label>
          <label>Data de nascimento<input type="date" required max={today()} value={form.dataNascimento} onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} /></label>
        </div>
        <label>URL da foto<input type="url" placeholder="https://…" value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })} /></label>
        <label>Detalhes<textarea rows={2} value={form.detalhes} onChange={(e) => setForm({ ...form, detalhes: e.target.value })} /></label>
        <div className="row">
          <button className="btn">{editing ? 'Salvar' : 'Cadastrar'}</button>
          {editing && <button type="button" className="btn secondary" onClick={() => { setEditing(null); setForm(empty); }}>Cancelar edição</button>}
        </div>
      </form>

      <h2>Meus cães</h2>
      {dogs === null && <p className="muted">Carregando…</p>}
      {dogs?.length === 0 && <p className="muted">Nenhum cachorro cadastrado ainda.</p>}
      <div className="list">
        {dogs?.map((d) => (
          <div className="item col" key={d.id}>
            <div className="row nowrap">
              <img src={d.foto || fotoPadrao} alt={d.nome} onError={(e) => (e.currentTarget.src = fotoPadrao)} />
              <div className="grow">
                <h3>{d.nome} {d.disponivel ? <span className="badge PENDENTE">Disponível</span> : <span className="badge APROVADO">Adotado</span>}</h3>
                <p className="muted">{d.raca} · {idade(d.dataNascimento)}</p>
                <div className="chips">
                  {d.vacinas.map((v) => (
                    <span key={v.idVacina} className="chip ok" title={`Aplicada em ${fmtDate(v.dataAplicacao)}`}>
                      💉 {v.vacina.nome} · {fmtDate(v.dataAplicacao)}
                      <button className="x" title="Remover" onClick={() => run(() => api(`/animais/${d.id}/vacinas/${v.idVacina}`, { method: 'DELETE' }), 'Vacina removida.')}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="actions">
                <button className="btn secondary small" onClick={() => edit(d)}>Editar</button>
                <button className="btn danger small" onClick={() => remove(d)}>Remover</button>
              </div>
            </div>
            <div className="row vac">
              <select value={vac[d.id]?.vacinaId ?? ''} onChange={(e) => patchVac(d.id, { vacinaId: e.target.value })}>
                <option value="">+ Registrar vacina aplicada…</option>
                {vacinas.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
              <input type="date" max={today()} value={vac[d.id]?.data ?? today()} onChange={(e) => patchVac(d.id, { data: e.target.value })} />
              <button className="btn small" onClick={() => addVacina(d)}>Registrar</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
