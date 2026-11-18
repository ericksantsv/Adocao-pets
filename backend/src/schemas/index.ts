import { z } from 'zod';
import { isValidCnpj, isValidCpf, onlyDigits } from '../lib/documents';
import { MATCH_STATUS, ROLES } from '../lib/constants';

const email = z.string().trim().toLowerCase().email('E-mail inválido');
const senha = z.string().min(6, 'Senha deve ter ao menos 6 caracteres');
const nome = z.string().trim().min(2, 'Nome muito curto');
const optionalText = z.string().trim().optional();
const id = z.coerce.number().int().positive();
const pastDate = (msg: string) => z.coerce.date().refine((d) => d.getTime() <= Date.now(), msg);

export const idParam = z.object({ id });
export const animalVacinaParams = z.object({ id, vacinaId: id });

export const registerAdotanteSchema = z.object({
  nome,
  cpf: z.string().refine(isValidCpf, 'CPF inválido').transform(onlyDigits),
  email,
  senha,
  telefone: optionalText,
  possuiPets: z.boolean().default(false),
  qtdPets: z.coerce.number().int().min(0).default(0),
});

export const registerInstituicaoSchema = z.object({
  nome,
  cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido').transform(onlyDigits),
  email,
  senha,
  telefone: optionalText,
  endereco: optionalText,
  cidade: optionalText,
});

export const loginSchema = z.object({
  role: z.enum(ROLES),
  email,
  senha: z.string().min(1, 'Informe a senha'),
});

export const updateAdotanteSchema = z.object({
  nome: nome.optional(),
  telefone: optionalText,
  possuiPets: z.boolean().optional(),
  qtdPets: z.coerce.number().int().min(0).optional(),
  senha: senha.optional(),
});

export const updateInstituicaoSchema = z.object({
  nome: nome.optional(),
  telefone: optionalText,
  endereco: optionalText,
  cidade: optionalText,
  senha: senha.optional(),
});

const animalBase = z.object({
  nome,
  raca: z.string().trim().min(2, 'Informe a raça'),
  dataNascimento: pastDate('Data de nascimento não pode ser futura'),
  detalhes: optionalText,
  foto: z.string().trim().url('URL da foto inválida').optional().or(z.literal('').transform(() => undefined)),
});
export const createAnimalSchema = animalBase;
export const updateAnimalSchema = animalBase.partial();

export const listAnimaisQuery = z.object({
  busca: z.string().trim().optional(),
  raca: z.string().trim().optional(),
  instituicaoId: id.optional(),
});

export const addVacinaSchema = z.object({
  vacinaId: id,
  dataAplicacao: pastDate('Data de aplicação não pode ser futura'),
});

export const createMatchSchema = z.object({
  animalId: id,
  dataVisita: z.coerce.date().refine((d) => d.getTime() > Date.now(), 'A visita deve ser agendada para o futuro').optional(),
  observacoes: optionalText,
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(MATCH_STATUS).exclude(['PENDENTE']),
  dataVisita: z.coerce.date().optional(),
});
