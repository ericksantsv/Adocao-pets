import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role, User } from '../types';

export function Profile() {
  const { user, role, setUser } = useAuth();
  const { notify } = useToast();
  const [f, setF] = useState({
    nome: user!.nome,
    telefone: user!.telefone ?? '',
    cidade: user!.cidade ?? '',
    endereco: user!.endereco ?? '',
    possuiPets: user!.possuiPets ?? false,
    qtdPets: user!.qtdPets ?? 0,
    senha: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean | number) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body =
      role === 'ADOTANTE'
        ? { nome: f.nome, telefone: f.telefone, possuiPets: f.possuiPets, qtdPets: Number(f.qtdPets) }
        : { nome: f.nome, telefone: f.telefone, cidade: f.cidade, endereco: f.endereco };
    try {
      const r = await api<{ role: Role; user: User }>('/perfil', { method: 'PUT', body: { ...body, ...(f.senha && { senha: f.senha }) } });
      setUser(r.user);
      set('senha', '');
      notify('success', 'Perfil atualizado!');
    } catch (err) {
      notify('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <h2>Meu perfil <span className="badge PENDENTE">{role === 'ADOTANTE' ? 'Adotante' : 'Instituição'}</span></h2>
      <label>E-mail<input value={user!.email} disabled /></label>
      <label>{role === 'ADOTANTE' ? 'CPF' : 'CNPJ'}<input value={(role === 'ADOTANTE' ? user!.cpf : user!.cnpj) ?? ''} disabled /></label>
      <label>Nome<input required value={f.nome} onChange={(e) => set('nome', e.target.value)} /></label>
      <label>Telefone<input value={f.telefone} onChange={(e) => set('telefone', e.target.value)} /></label>
      {role === 'ADOTANTE' ? (
        <div className="row">
          <label className="check"><input type="checkbox" checked={f.possuiPets} onChange={(e) => set('possuiPets', e.target.checked)} /> Possuo pets</label>
          <label>Quantidade<input type="number" min={0} value={f.qtdPets} onChange={(e) => set('qtdPets', e.target.value)} /></label>
        </div>
      ) : (
        <>
          <label>Cidade<input value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></label>
          <label>Endereço<input value={f.endereco} onChange={(e) => set('endereco', e.target.value)} /></label>
        </>
      )}
      <label>Nova senha (deixe em branco para manter)<input type="password" minLength={6} value={f.senha} onChange={(e) => set('senha', e.target.value)} /></label>
      <button className="btn" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
    </form>
  );
}
