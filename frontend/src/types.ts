export type Role = 'INSTITUICAO' | 'ADOTANTE';
export type MatchStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'APROVADO' | 'CANCELADO';

export interface User {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  // adotante
  cpf?: string;
  possuiPets?: boolean;
  qtdPets?: number;
  // instituição
  cnpj?: string;
  endereco?: string | null;
  cidade?: string | null;
}

export interface Vacina {
  id: number;
  nome: string;
}

export interface Animal {
  id: number;
  nome: string;
  raca: string;
  tipo: string;
  dataNascimento: string;
  detalhes?: string | null;
  foto?: string | null;
  idInstituicao: number;
  disponivel: boolean;
  instituicao: { id: number; nome: string; cidade?: string | null; telefone?: string | null; email: string };
  vacinas: { idVacina: number; dataAplicacao: string; vacina: Vacina }[];
}

export interface Match {
  id: number;
  status: MatchStatus;
  dataVisita?: string | null;
  observacoes?: string | null;
  criadoEm: string;
  animal: { id: number; nome: string; raca: string; foto?: string | null; instituicao: { nome: string; telefone?: string | null } };
  adotante: { id: number; nome: string; email: string; telefone?: string | null; possuiPets: boolean; qtdPets: number };
}
