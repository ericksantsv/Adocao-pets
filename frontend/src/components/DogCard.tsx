import { Link } from 'react-router-dom';
import type { Animal } from '../types';

export function idade(nascimento: string) {
  const meses = Math.max(0, Math.floor((Date.now() - new Date(nascimento).getTime()) / (30.44 * 864e5)));
  return meses < 12 ? `${meses} ${meses === 1 ? 'mês' : 'meses'}` : `${Math.floor(meses / 12)} ${meses < 24 ? 'ano' : 'anos'}`;
}

export const fotoPadrao = 'https://placehold.co/500x400?text=%F0%9F%90%B6';

export function DogCard({ dog }: { dog: Animal }) {
  return (
    <Link to={`/caes/${dog.id}`} className="card dog">
      <img src={dog.foto || fotoPadrao} alt={dog.nome} onError={(e) => (e.currentTarget.src = fotoPadrao)} />
      <div className="card-body">
        <h3>{dog.nome}</h3>
        <p className="muted">{dog.raca} · {idade(dog.dataNascimento)}</p>
        <p className="muted">🏠 {dog.instituicao.nome}{dog.instituicao.cidade ? ` — ${dog.instituicao.cidade}` : ''}</p>
        <div className="chips">
          {dog.vacinas.length === 0 && <span className="chip warn">Sem vacinas registradas</span>}
          {dog.vacinas.map((v) => <span key={v.idVacina} className="chip ok">💉 {v.vacina.nome}</span>)}
        </div>
      </div>
    </Link>
  );
}
