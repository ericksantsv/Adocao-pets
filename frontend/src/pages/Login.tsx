import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Role } from '../types';

export function Login() {
  const { login, verify2FA } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';

  const [role, setRole] = useState<Role>('ADOTANTE');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [step2FA, setStep2FA] = useState(false);
  const [code, setCode] = useState('');
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitCredentials(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login(role, email, senha);
      if (res.requires2FA) {
        setStep2FA(true);
        setCodeHint(res.devCodeHint ?? null);
        notify('success', `Código 2FA enviado! (Código gerado: ${res.devCodeHint})`);
      }
    } catch (err) {
      notify('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit2FA(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verify2FA(role, email, code);
      notify('success', 'Autenticação 2FA concluída com sucesso!');
      navigate(from, { replace: true });
    } catch (err) {
      notify('error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (step2FA) {
    return (
      <form className="form panel" onSubmit={submit2FA}>
        <h2>Verificação em 2 Etapas (2FA)</h2>
        <p className="muted">
          Digite o código de 6 dígitos gerado para <strong>{email}</strong>.
        </p>
        {codeHint && (
          <p className="muted small-text">
            Código no console do servidor (ambiente local): <strong>{codeHint}</strong>
          </p>
        )}
        <label>
          Código de 6 dígitos
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        <button className="btn" disabled={busy || code.length !== 6}>
          {busy ? 'Validando…' : 'Confirmar código'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setStep2FA(false);
            setCode('');
            setCodeHint(null);
          }}
        >
          Voltar
        </button>
      </form>
    );
  }

  return (
    <form className="form panel" onSubmit={submitCredentials}>
      <h2>Entrar</h2>
      <div className="tabs">
        <button type="button" className={role === 'ADOTANTE' ? 'active' : ''} onClick={() => setRole('ADOTANTE')}>Sou adotante</button>
        <button type="button" className={role === 'INSTITUICAO' ? 'active' : ''} onClick={() => setRole('INSTITUICAO')}>Sou instituição</button>
      </div>
      <label>E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Senha<input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
      <button className="btn" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      <p className="muted">Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
      <p className="muted small-text">Demo (após o seed): {role === 'ADOTANTE' ? 'adotante@exemplo.com' : 'abrigo@exemplo.com'} / 123456</p>
    </form>
  );
}