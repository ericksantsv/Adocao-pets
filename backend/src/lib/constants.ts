export const ROLES = ['INSTITUICAO', 'ADOTANTE'] as const;
export type Role = (typeof ROLES)[number];

export const MATCH_STATUS = ['PENDENTE', 'EM_ANDAMENTO', 'APROVADO', 'CANCELADO'] as const;
export type MatchStatus = (typeof MATCH_STATUS)[number];

export const TIPO_ANIMAL = 'CAO';

/** Transições permitidas de status de um Match. */
export const MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  PENDENTE: ['EM_ANDAMENTO', 'APROVADO', 'CANCELADO'],
  EM_ANDAMENTO: ['APROVADO', 'CANCELADO'],
  APROVADO: [],
  CANCELADO: [],
};
