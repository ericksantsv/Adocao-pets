import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { fotoPadrao, idade } from '../components/DogCard';
import { fmtDate } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Animal } from '../types';

export function DogDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [dog, setDog] = useState<Animal | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [dataVisita, setDataVisita] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api<Animal>(`/animais/${id}`).then(setDog).catch(() => setNotFound(true));
  }, [id]);

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api('/matches', {
        method: 'POST',
        body: {
          animalId: Number(id),
          ...(dataVisita && { dataVisita: new Date(dataVisita).toISOString() }),
          ...(observacoes && { observacoes }),
        },
      });
      notify('success', `Solicitação enviada para adotar ${dog?.nome}! Acompanhe em "Meus pedidos".`);
      navigate('/meus-pedidos');
    } catch (err) {
      notify('error', (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (notFound) return <p className="center">Cachorro não encontrado. <Link to="/">Voltar</Link></p>;
  if (!dog) return <p className="center muted">Carregando…</p>;

  return (
    <div className="detail">
      <img src={dog.foto || fotoPadrao} alt={dog.nome} onError={(e) => (e.currentTarget.src = fotoPadrao)} />
      <div>
        <h1>{dog.nome} {!dog.disponivel && <span className="badge APROVADO">Já adotado</span>}</h1>
        <p className="muted">{dog.raca} · {idade(dog.dataNascimento)} (nasc. {fmtDate(dog.dataNascimento)})</p>
        {dog.detalhes && <p>{dog.detalhes}</p>}

        <h3>💉 Vacinas</h3>
        {dog.vacinas.length === 0 ? <p className="muted">Nenhuma vacina registrada.</p> : (
          <ul>{dog.vacinas.map((v) => <li key={v.idVacina}>{v.vacina.nome} — aplicada em {fmtDate(v.dataAplicacao)}</li>)}</ul>
        )}

        <h3>🏠 Instituição</h3>
        <p>{dog.instituicao.nome}{dog.instituicao.cidade ? ` — ${dog.instituicao.cidade}` : ''}<br />
          <span className="muted">{dog.instituicao.email}{dog.instituicao.telefone ? ` · ${dog.instituicao.telefone}` : ''}</span></p>

        <hr />
        {!user && <p>Para solicitar a adoção, <Link to="/login" state={{ from: `/caes/${dog.id}` }}>entre</Link> ou <Link to="/cadastro">cadastre-se</Link> como adotante.</p>}
        {role === 'INSTITUICAO' && <p className="muted">Instituições não podem solicitar adoção.</p>}
        {role === 'ADOTANTE' && dog.disponivel && (
          <form onSubmit={solicitar} className="form">
            <h3>Solicitar adoção</h3>
            <label>Agendar visita (opcional)
              <input type="datetime-local" value={dataVisita} onChange={(e) => setDataVisita(e.target.value)} />
            </label>
            <label>Mensagem para a instituição
              <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Conte um pouco sobre você e sua casa" />
            </label>
            <button className="btn" disabled={sending}>{sending ? 'Enviando…' : '❤️ Quero adotar'}</button>
          </form>
        )}
        {role === 'ADOTANTE' && !dog.disponivel && <p className="muted">Este cachorro já encontrou um lar.</p>}
      </div>
    </div>
  );
}
