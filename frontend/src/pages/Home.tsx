import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { DogCard } from '../components/DogCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Animal } from '../types';

export function Home() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [dogs, setDogs] = useState<Animal[] | null>(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api<Animal[]>(`/animais${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`)
        .then(setDogs)
        .catch((e) => {
          setDogs([]);
          notify('error', e.message);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [busca, notify]);

  return (
    <>
      <section className="hero">
        <h1>Encontre seu novo melhor amigo 🐾</h1>
        <p>Conheça cães de abrigos parceiros, veja o histórico de vacinas e solicite a adoção em poucos cliques.</p>
        {!user && (
          <div className="row center">
            <Link to="/cadastro" className="btn">Quero adotar</Link>
            <Link to="/login" className="btn secondary">Já tenho conta</Link>
          </div>
        )}
      </section>

      <div className="toolbar">
        <h2>Cães disponíveis para adoção</h2>
        <input placeholder="Buscar por nome ou raça…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {dogs === null && <p className="muted center">Carregando…</p>}
      {dogs?.length === 0 && <p className="muted center">Nenhum cachorro disponível no momento.</p>}
      <div className="grid">{dogs?.map((d) => <DogCard key={d.id} dog={d} />)}</div>
    </>
  );
}
