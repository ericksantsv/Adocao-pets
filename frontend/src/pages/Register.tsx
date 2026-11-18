import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../types';

export function Register() {
  const { register } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('ADOTANTE');
  const [f, setF] = useState({ nome: '', documento: '', email: '', senha: '', telefone: '', cidade: '', endereco: '', possuiPets: false, qtdPets: 0 });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean | number) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const base = { nome: f.nome, email: f.email, senha: f.senha, telefone: f.telefone || undefined };
    const data =
      role === 'ADOTANTE'
        ? { ...base, cpf: f.documento, possuiPets: f.possuiPets, qtdPets: Number(f.qtdPets) }
        : { ...base, cnpj: f.documento, cidade: f.cidade || undefined, endereco: f.endereco || undefined };
    try {
      await register(role, data);
      notify('success', 'Cadastro realizado! Bem-vindo(a).');
      navigate(role === 'INSTITUICAO' ? '/gestao/caes' : '/');
    } catch (err) {
      notify('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form panel" onSubmit={submit}>
      <h2>Criar conta</h2>
      <div className="tabs">
        <button type="button" className={role === 'ADOTANTE' ? 'active' : ''} onClick={() => setRole('ADOTANTE')}>Adotante (CPF)</button>
        <button type="button" className={role === 'INSTITUICAO' ? 'active' : ''} onClick={() => setRole('INSTITUICAO')}>Instituição (CNPJ)</button>
      </div>
      <label>Nome<input required value={f.nome} onChange={(e) => set('nome', e.target.value)} /></label>
      <label>{role === 'ADOTANTE' ? 'CPF' : 'CNPJ'}
        <input required value={f.documento} onChange={(e) => set('documento', e.target.value)} placeholder={role === 'ADOTANTE' ? '000.000.000-00' : '00.000.000/0000-00'} />
      </label>
      <label>E-mail<input type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
      <label>Senha (mín. 6)<input type="password" required minLength={6} value={f.senha} onChange={(e) => set('senha', e.target.value)} /></label>
      <label>Telefone<input value={f.telefone} onChange={(e) => set('telefone', e.target.value)} /></label>

      {role === 'ADOTANTE' ? (
        <div className="row">
          <label className="check"><input type="checkbox" checked={f.possuiPets} onChange={(e) => set('possuiPets', e.target.checked)} /> Já possuo pets</label>
          <label>Quantos?<input type="number" min={0} value={f.qtdPets} onChange={(e) => set('qtdPets', e.target.value)} /></label>
        </div>
      ) : (
        <>
          <label>Cidade<input value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></label>
          <label>Endereço<input value={f.endereco} onChange={(e) => set('endereco', e.target.value)} /></label>
        </>
      )}
      <button className="btn" disabled={busy}>{busy ? 'Cadastrando…' : 'Cadastrar'}</button>
      <p className="muted">Já tem conta? <Link to="/login">Entrar</Link></p>
    </form>
  );
}
